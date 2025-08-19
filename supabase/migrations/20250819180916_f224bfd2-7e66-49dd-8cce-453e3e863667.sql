-- Create departments table for user organization structure
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  manager_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create assignment_rules table for ticket assignment automation
CREATE TABLE public.assignment_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rule_type text NOT NULL CHECK (rule_type IN ('round_robin', 'workload_based', 'skill_based', 'priority_based')),
  department_id uuid REFERENCES public.departments(id),
  priority_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  conditions jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_rules ENABLE ROW LEVEL SECURITY;

-- Add department_id and signature to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id),
ADD COLUMN IF NOT EXISTS signature text;

-- Create RLS policies for departments
CREATE POLICY "Departments are viewable by organization members"
ON public.departments FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can manage departments"
ON public.departments FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Create RLS policies for assignment_rules
CREATE POLICY "Assignment rules are viewable by organization members"
ON public.assignment_rules FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can manage assignment rules"
ON public.assignment_rules FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Add triggers for timestamps
CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignment_rules_updated_at
BEFORE UPDATE ON public.assignment_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_departments_org_id ON public.departments(organization_id);
CREATE INDEX idx_assignment_rules_org_id ON public.assignment_rules(organization_id);
CREATE INDEX idx_assignment_rules_dept_id ON public.assignment_rules(department_id);
CREATE INDEX idx_profiles_dept_id ON public.profiles(department_id);