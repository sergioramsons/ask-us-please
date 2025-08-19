-- Create groups table
CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  organization_id uuid NOT NULL,
  manager_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(name, organization_id)
);

-- Create user_groups junction table
CREATE TABLE public.user_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  role_in_group text DEFAULT 'member',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, group_id)
);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;

-- Groups policies
CREATE POLICY "Groups are viewable by organization members" 
ON public.groups 
FOR SELECT 
USING (organization_id IN (
  SELECT profiles.organization_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Organization admins can manage groups" 
ON public.groups 
FOR ALL 
USING (organization_id IN (
  SELECT user_roles.organization_id
  FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('Administrator', 'Account Administrator', 'Team Lead')
));

-- User groups policies
CREATE POLICY "User groups are viewable by organization members" 
ON public.user_groups 
FOR SELECT 
USING (organization_id IN (
  SELECT profiles.organization_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Organization admins can manage user groups" 
ON public.user_groups 
FOR ALL 
USING (organization_id IN (
  SELECT user_roles.organization_id
  FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('Administrator', 'Account Administrator', 'Team Lead')
));

-- Create trigger for updated_at
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add group permissions
INSERT INTO public.permissions (name, description, category) VALUES
('groups.view', 'View groups', 'Groups'),
('groups.create', 'Create new groups', 'Groups'),
('groups.edit', 'Edit existing groups', 'Groups'),
('groups.delete', 'Delete groups', 'Groups'),
('groups.manage_members', 'Add/remove group members', 'Groups');

-- Assign group permissions to roles
INSERT INTO public.role_permissions (role_id, permission_id, organization_id)
SELECT 
  or1.id as role_id,
  p.id as permission_id,
  or1.organization_id
FROM public.organization_roles or1
CROSS JOIN public.permissions p
WHERE 
  p.category = 'Groups' AND (
    -- Account Administrator gets all group permissions
    (or1.role_name = 'Account Administrator') OR
    
    -- Administrator gets all group permissions
    (or1.role_name = 'Administrator') OR
    
    -- Team Lead gets group management permissions
    (or1.role_name = 'Team Lead' AND p.name IN ('groups.view', 'groups.create', 'groups.edit', 'groups.manage_members')) OR
    
    -- Full Agent can view groups
    (or1.role_name = 'Full Agent' AND p.name = 'groups.view') OR
    
    -- Occasional Agent can view groups
    (or1.role_name = 'Occasional Agent' AND p.name = 'groups.view')
  );