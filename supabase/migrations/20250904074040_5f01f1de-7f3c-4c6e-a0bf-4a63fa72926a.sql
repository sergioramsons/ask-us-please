-- Create agent skills table
CREATE TABLE public.agent_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  skill_name TEXT NOT NULL,
  skill_level INTEGER DEFAULT 1 CHECK (skill_level >= 1 AND skill_level <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id, skill_name)
);

-- Create agent availability table
CREATE TABLE public.agent_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  max_tickets INTEGER DEFAULT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE(organization_id, user_id)
);

-- Create assignment tracking table for round-robin
CREATE TABLE public.assignment_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  department_id UUID,
  group_id UUID,
  last_assigned_user_id UUID,
  assignment_method TEXT NOT NULL DEFAULT 'round_robin' CHECK (assignment_method IN ('round_robin', 'load_balanced', 'skill_based')),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, department_id, group_id)
);

-- Add skills column to tickets for skill-based routing
ALTER TABLE public.tickets 
ADD COLUMN required_skills TEXT[] DEFAULT NULL;

-- Add assignment settings to organizations
ALTER TABLE public.organizations
ADD COLUMN assignment_settings JSONB DEFAULT '{
  "method": "round_robin",
  "allow_agent_availability_control": true,
  "default_max_tickets_per_agent": 10
}'::jsonb;

-- Enable RLS on new tables
ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent_skills
CREATE POLICY "Agent skills are viewable by organization members" 
ON public.agent_skills 
FOR SELECT 
USING (organization_id IN (
  SELECT organization_id FROM profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Organization admins can manage agent skills" 
ON public.agent_skills 
FOR ALL 
USING (organization_id IN (
  SELECT ur.organization_id FROM user_roles ur 
  WHERE ur.user_id = auth.uid() AND ur.role = ANY(ARRAY['admin', 'super_admin'])
));

CREATE POLICY "Users can manage their own skills" 
ON public.agent_skills 
FOR ALL 
USING (auth.uid() = user_id);

-- RLS policies for agent_availability
CREATE POLICY "Agent availability is viewable by organization members" 
ON public.agent_availability 
FOR SELECT 
USING (organization_id IN (
  SELECT organization_id FROM profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Organization admins can manage agent availability" 
ON public.agent_availability 
FOR ALL 
USING (organization_id IN (
  SELECT ur.organization_id FROM user_roles ur 
  WHERE ur.user_id = auth.uid() AND ur.role = ANY(ARRAY['admin', 'super_admin'])
));

CREATE POLICY "Users can manage their own availability" 
ON public.agent_availability 
FOR ALL 
USING (auth.uid() = user_id);

-- RLS policies for assignment_tracking
CREATE POLICY "Assignment tracking is viewable by organization members" 
ON public.assignment_tracking 
FOR SELECT 
USING (organization_id IN (
  SELECT organization_id FROM profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Organization admins can manage assignment tracking" 
ON public.assignment_tracking 
FOR ALL 
USING (organization_id IN (
  SELECT ur.organization_id FROM user_roles ur 
  WHERE ur.user_id = auth.uid() AND ur.role = ANY(ARRAY['admin', 'super_admin'])
));

-- Create triggers for updated_at
CREATE TRIGGER update_agent_skills_updated_at
BEFORE UPDATE ON public.agent_skills
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_availability_updated_at
BEFORE UPDATE ON public.agent_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignment_tracking_updated_at
BEFORE UPDATE ON public.assignment_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();