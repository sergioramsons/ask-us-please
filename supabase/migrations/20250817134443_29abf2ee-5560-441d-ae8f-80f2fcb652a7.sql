-- Add foreign key constraint to agent_availability table
ALTER TABLE public.agent_availability 
ADD CONSTRAINT fk_agent_availability_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key constraint for organization_id
ALTER TABLE public.agent_availability 
ADD CONSTRAINT fk_agent_availability_organization_id 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add foreign key constraint for department_id
ALTER TABLE public.agent_availability 
ADD CONSTRAINT fk_agent_availability_department_id 
FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;