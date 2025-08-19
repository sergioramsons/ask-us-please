-- Update organization_roles to include Freshdesk-style default roles
UPDATE public.organization_roles 
SET role_name = CASE 
  WHEN role_name = 'agent' THEN 'Full Agent'
  WHEN role_name = 'supervisor' THEN 'Team Lead'
  WHEN role_name = 'admin' THEN 'Administrator'
  WHEN role_name = 'account_admin' THEN 'Account Administrator'
  ELSE role_name
END,
description = CASE 
  WHEN role_name = 'agent' THEN 'Full-time agents with complete access to helpdesk features'
  WHEN role_name = 'supervisor' THEN 'Team leaders who can manage agents and monitor performance'
  WHEN role_name = 'admin' THEN 'Administrators with access to system configuration and settings'
  WHEN role_name = 'account_admin' THEN 'Account administrators with full system access and billing management'
  ELSE description
END
WHERE role_name IN ('agent', 'supervisor', 'admin', 'account_admin');

-- Add the new Occasional Agent role for all organizations
INSERT INTO public.organization_roles (organization_id, role_name, description, is_admin_role, is_default)
SELECT DISTINCT organization_id, 'Occasional Agent', 'Part-time agents with limited access to helpdesk features', false, true
FROM public.organization_roles
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_roles or2 
  WHERE or2.organization_id = organization_roles.organization_id 
  AND or2.role_name = 'Occasional Agent'
);

-- Update user_roles table to match the new role names
UPDATE public.user_roles 
SET role = CASE 
  WHEN role = 'agent' THEN 'Full Agent'
  WHEN role = 'supervisor' THEN 'Team Lead'
  WHEN role = 'admin' THEN 'Administrator'
  WHEN role = 'account_admin' THEN 'Account Administrator'
  ELSE role
END
WHERE role IN ('agent', 'supervisor', 'admin', 'account_admin');