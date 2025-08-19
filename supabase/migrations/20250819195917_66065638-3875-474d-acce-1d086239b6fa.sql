-- Create a basic auto-assignment function for tickets
CREATE OR REPLACE FUNCTION public.auto_assign_ticket(ticket_id_param uuid, org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_agent_id uuid;
  assigned_agent_name text;
  ticket_priority text;
  ticket_category text;
  agent_record record;
BEGIN
  -- Get ticket details
  SELECT priority, category INTO ticket_priority, ticket_category
  FROM tickets 
  WHERE id = ticket_id_param;
  
  -- Try to find an available agent based on workload
  -- Priority: admin/moderator roles, then by current ticket count
  FOR agent_record IN
    SELECT DISTINCT 
      p.user_id,
      p.display_name,
      ur.role,
      COALESCE(ticket_counts.current_tickets, 0) as current_tickets
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.user_id
    LEFT JOIN (
      SELECT 
        assigned_to,
        COUNT(*) as current_tickets
      FROM tickets 
      WHERE assigned_to IS NOT NULL 
        AND status IN ('open', 'in_progress', 'pending')
        AND organization_id = org_id
      GROUP BY assigned_to
    ) ticket_counts ON ticket_counts.assigned_to = p.user_id
    WHERE p.organization_id = org_id
      AND ur.organization_id = org_id
      AND ur.role IN ('admin', 'moderator', 'agent')
    ORDER BY 
      CASE WHEN ur.role = 'admin' THEN 1
           WHEN ur.role = 'moderator' THEN 2
           ELSE 3 END,
      COALESCE(ticket_counts.current_tickets, 0) ASC,
      p.created_at ASC
    LIMIT 1
  LOOP
    assigned_agent_id := agent_record.user_id;
    assigned_agent_name := COALESCE(agent_record.display_name, 'Agent');
    EXIT;
  END LOOP;
  
  -- If we found an agent, assign the ticket
  IF assigned_agent_id IS NOT NULL THEN
    UPDATE tickets 
    SET assigned_to = assigned_agent_id,
        updated_at = now()
    WHERE id = ticket_id_param;
    
    RETURN assigned_agent_name;
  ELSE
    -- No available agents found
    RETURN NULL;
  END IF;
END;
$$;

-- Create a default assignment rule for workload-based auto-assignment
INSERT INTO public.assignment_rules (
  organization_id,
  rule_type,
  conditions,
  is_active,
  priority_order
) VALUES (
  'cfaee5bc-0105-4b93-b1d7-8a6ed8faa102',
  'workload_based',
  '{"criteria": "balance_workload", "roles": ["admin", "moderator", "agent"], "max_tickets_per_agent": 10}'::jsonb,
  true,
  1
) ON CONFLICT DO NOTHING;