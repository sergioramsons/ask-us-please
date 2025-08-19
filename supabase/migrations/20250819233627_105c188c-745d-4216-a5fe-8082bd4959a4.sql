-- Create permissions table
CREATE TABLE public.permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  category text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create role_permissions junction table
CREATE TABLE public.role_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id uuid NOT NULL REFERENCES public.organization_roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Permissions policies
CREATE POLICY "Permissions are viewable by everyone" 
ON public.permissions 
FOR SELECT 
USING (true);

-- Role permissions policies
CREATE POLICY "Role permissions are viewable by organization members" 
ON public.role_permissions 
FOR SELECT 
USING (organization_id IN (
  SELECT profiles.organization_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Organization admins can manage role permissions" 
ON public.role_permissions 
FOR ALL 
USING (organization_id IN (
  SELECT user_roles.organization_id
  FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('Administrator', 'Account Administrator')
));

-- Insert standard helpdesk permissions
INSERT INTO public.permissions (name, description, category) VALUES
-- Ticket permissions
('tickets.view_all', 'View all tickets in the organization', 'Tickets'),
('tickets.view_assigned', 'View only assigned tickets', 'Tickets'),
('tickets.create', 'Create new tickets', 'Tickets'),
('tickets.edit', 'Edit existing tickets', 'Tickets'),
('tickets.delete', 'Delete tickets', 'Tickets'),
('tickets.assign', 'Assign tickets to agents', 'Tickets'),
('tickets.change_status', 'Change ticket status', 'Tickets'),
('tickets.add_comments', 'Add comments to tickets', 'Tickets'),
('tickets.view_internal_comments', 'View internal comments on tickets', 'Tickets'),

-- Contact & Company permissions
('contacts.view', 'View contacts', 'Contacts'),
('contacts.create', 'Create new contacts', 'Contacts'),
('contacts.edit', 'Edit existing contacts', 'Contacts'),
('contacts.delete', 'Delete contacts', 'Contacts'),
('companies.view', 'View companies', 'Companies'),
('companies.create', 'Create new companies', 'Companies'),
('companies.edit', 'Edit existing companies', 'Companies'),
('companies.delete', 'Delete companies', 'Companies'),

-- Reports permissions
('reports.view', 'View reports and analytics', 'Reports'),
('reports.export', 'Export reports', 'Reports'),
('reports.advanced', 'Access advanced reporting features', 'Reports'),

-- User management permissions
('users.view', 'View user list', 'User Management'),
('users.create', 'Create new users', 'User Management'),
('users.edit', 'Edit user profiles', 'User Management'),
('users.delete', 'Delete users', 'User Management'),
('roles.view', 'View roles', 'User Management'),
('roles.create', 'Create custom roles', 'User Management'),
('roles.edit', 'Edit roles and permissions', 'User Management'),
('roles.delete', 'Delete custom roles', 'User Management'),

-- System configuration permissions
('settings.email', 'Configure email settings', 'System Settings'),
('settings.integrations', 'Manage integrations', 'System Settings'),
('settings.workflows', 'Configure workflows and automations', 'System Settings'),
('settings.business_hours', 'Configure business hours', 'System Settings'),
('settings.organization', 'Manage organization settings', 'System Settings'),

-- Channel permissions
('channels.view', 'View communication channels', 'Channels'),
('channels.manage', 'Manage communication channels', 'Channels'),
('inbox.view', 'View unified inbox', 'Channels'),
('inbox.manage', 'Manage unified inbox', 'Channels');

-- Assign default permissions to existing roles
INSERT INTO public.role_permissions (role_id, permission_id, organization_id)
SELECT 
  or1.id as role_id,
  p.id as permission_id,
  or1.organization_id
FROM public.organization_roles or1
CROSS JOIN public.permissions p
WHERE 
  -- Account Administrator gets all permissions
  (or1.role_name = 'Account Administrator') OR
  
  -- Administrator gets most permissions except organization management
  (or1.role_name = 'Administrator' AND p.name != 'settings.organization') OR
  
  -- Team Lead gets team management and reporting permissions
  (or1.role_name = 'Team Lead' AND p.category IN ('Tickets', 'Contacts', 'Companies', 'Reports', 'Channels') AND p.name NOT IN ('tickets.delete', 'contacts.delete', 'companies.delete')) OR
  
  -- Full Agent gets standard agent permissions
  (or1.role_name = 'Full Agent' AND p.name IN (
    'tickets.view_assigned', 'tickets.create', 'tickets.edit', 'tickets.change_status', 'tickets.add_comments', 'tickets.assign',
    'contacts.view', 'contacts.create', 'contacts.edit',
    'companies.view',
    'reports.view',
    'channels.view', 'inbox.view'
  )) OR
  
  -- Occasional Agent gets limited permissions
  (or1.role_name = 'Occasional Agent' AND p.name IN (
    'tickets.view_assigned', 'tickets.add_comments', 'tickets.change_status',
    'contacts.view',
    'companies.view',
    'channels.view', 'inbox.view'
  ));