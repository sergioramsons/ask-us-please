-- Add assignment-related fields to tickets table
ALTER TABLE public.tickets 
ADD COLUMN auto_assigned BOOLEAN DEFAULT FALSE,
ADD COLUMN assigned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN transferred_from UUID REFERENCES auth.users(id),
ADD COLUMN transfer_reason TEXT;

-- Create assignment_rules table for automatic assignment logic
CREATE TABLE public.assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('round_robin', 'department', 'least_active', 'manual')),
  department_id UUID REFERENCES public.departments(id),
  is_active BOOLEAN DEFAULT TRUE,
  priority_order INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on assignment_rules
ALTER TABLE public.assignment_rules ENABLE ROW LEVEL SECURITY;

-- Create policy for assignment rules
CREATE POLICY "Admins can manage assignment rules in their organization"
ON public.assignment_rules
FOR ALL
USING ((organization_id = get_user_organization()) AND current_user_has_role('admin'::app_role))
WITH CHECK ((organization_id = get_user_organization()) AND current_user_has_role('admin'::app_role));

-- Create agent_availability table to track agent workload
CREATE TABLE public.agent_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID REFERENCES public.organizations(id),
  is_available BOOLEAN DEFAULT TRUE,
  max_tickets INTEGER DEFAULT 10,
  current_tickets INTEGER DEFAULT 0,
  department_id UUID REFERENCES public.departments(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on agent_availability
ALTER TABLE public.agent_availability ENABLE ROW LEVEL SECURITY;

-- Create policies for agent availability
CREATE POLICY "Users can view their own availability"
ON public.agent_availability
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own availability"
ON public.agent_availability
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage agent availability in their organization"
ON public.agent_availability
FOR ALL
USING ((organization_id = get_user_organization()) AND current_user_has_role('admin'::app_role));

-- Create function to automatically assign tickets
CREATE OR REPLACE FUNCTION public.auto_assign_ticket(ticket_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assignment_rule assignment_rules%ROWTYPE;
  selected_agent_id UUID;
  ticket_org_id UUID;
  ticket_dept_id UUID;
BEGIN
  -- Get ticket organization and department
  SELECT organization_id, department_id INTO ticket_org_id, ticket_dept_id
  FROM public.tickets WHERE id = ticket_id;
  
  IF ticket_org_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get active assignment rule for organization
  SELECT * INTO assignment_rule
  FROM public.assignment_rules
  WHERE organization_id = ticket_org_id 
    AND is_active = TRUE
    AND (department_id IS NULL OR department_id = ticket_dept_id)
  ORDER BY priority_order
  LIMIT 1;
  
  IF assignment_rule.id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Apply assignment logic based on rule type
  CASE assignment_rule.rule_type
    WHEN 'round_robin' THEN
      -- Find agent with least recent assignment
      SELECT p.user_id INTO selected_agent_id
      FROM public.profiles p
      LEFT JOIN public.tickets t ON t.assigned_to = p.user_id
      WHERE p.organization_id = ticket_org_id
        AND (assignment_rule.department_id IS NULL OR p.department_id = assignment_rule.department_id)
        AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('admin', 'moderator'))
      GROUP BY p.user_id
      ORDER BY MAX(t.assigned_at) NULLS FIRST
      LIMIT 1;
      
    WHEN 'least_active' THEN
      -- Find agent with least active tickets
      SELECT aa.user_id INTO selected_agent_id
      FROM public.agent_availability aa
      WHERE aa.organization_id = ticket_org_id
        AND aa.is_available = TRUE
        AND aa.current_tickets < aa.max_tickets
        AND (assignment_rule.department_id IS NULL OR aa.department_id = assignment_rule.department_id)
      ORDER BY aa.current_tickets ASC
      LIMIT 1;
      
    WHEN 'department' THEN
      -- Assign to department manager or any agent in department
      SELECT p.user_id INTO selected_agent_id
      FROM public.profiles p
      JOIN public.departments d ON d.id = p.department_id
      WHERE p.organization_id = ticket_org_id
        AND p.department_id = ticket_dept_id
        AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('admin', 'moderator'))
      ORDER BY CASE WHEN d.manager_id = p.user_id THEN 1 ELSE 2 END
      LIMIT 1;
      
    ELSE
      RETURN NULL;
  END CASE;
  
  -- Update ticket with assignment
  IF selected_agent_id IS NOT NULL THEN
    UPDATE public.tickets
    SET assigned_to = selected_agent_id,
        assigned_at = NOW(),
        auto_assigned = TRUE,
        updated_at = NOW()
    WHERE id = ticket_id;
    
    -- Update agent availability if exists
    UPDATE public.agent_availability
    SET current_tickets = current_tickets + 1,
        updated_at = NOW()
    WHERE user_id = selected_agent_id;
  END IF;
  
  RETURN selected_agent_id;
END;
$$;

-- Create function to transfer ticket
CREATE OR REPLACE FUNCTION public.transfer_ticket(
  ticket_id UUID,
  new_agent_id UUID,
  transfer_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_agent_id UUID;
BEGIN
  -- Get current assignment
  SELECT assigned_to INTO old_agent_id
  FROM public.tickets WHERE id = ticket_id;
  
  -- Update ticket assignment
  UPDATE public.tickets
  SET assigned_to = new_agent_id,
      assigned_at = NOW(),
      transferred_from = old_agent_id,
      transfer_reason = transfer_reason,
      auto_assigned = FALSE,
      updated_at = NOW()
  WHERE id = ticket_id;
  
  -- Update agent availability counts
  IF old_agent_id IS NOT NULL THEN
    UPDATE public.agent_availability
    SET current_tickets = GREATEST(current_tickets - 1, 0),
        updated_at = NOW()
    WHERE user_id = old_agent_id;
  END IF;
  
  IF new_agent_id IS NOT NULL THEN
    UPDATE public.agent_availability
    SET current_tickets = current_tickets + 1,
        updated_at = NOW()
    WHERE user_id = new_agent_id;
  END IF;
  
  RETURN TRUE;
END;
$$;