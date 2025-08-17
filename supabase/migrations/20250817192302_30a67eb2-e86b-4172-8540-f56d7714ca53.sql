-- Update the app_role enum to match Freshdesk roles
ALTER TYPE public.app_role RENAME TO app_role_old;

CREATE TYPE public.app_role AS ENUM ('agent', 'supervisor', 'admin', 'account_admin');

-- Update user_roles table to use new enum
ALTER TABLE public.user_roles 
ALTER COLUMN role TYPE public.app_role USING 
  CASE 
    WHEN role::text = 'user' THEN 'agent'::public.app_role
    WHEN role::text = 'moderator' THEN 'supervisor'::public.app_role
    WHEN role::text = 'admin' THEN 'admin'::public.app_role
    ELSE 'agent'::public.app_role
  END;

-- Drop the old enum type
DROP TYPE public.app_role_old;

-- Update existing functions that reference the old role values
CREATE OR REPLACE FUNCTION public.current_user_has_role(_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), _role)
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Update RLS policies to use new roles
-- Update departments policy
DROP POLICY IF EXISTS "Admins can manage departments in their organization" ON departments;
CREATE POLICY "Admins can manage departments in their organization"
ON departments
FOR ALL
TO authenticated
USING ((organization_id = get_user_organization()) AND (current_user_has_role('admin'::app_role) OR current_user_has_role('account_admin'::app_role)))
WITH CHECK ((current_user_has_role('admin'::app_role) OR current_user_has_role('account_admin'::app_role)));

-- Update tickets policies to include supervisors
DROP POLICY IF EXISTS "Users can update tickets in their organization" ON tickets;
CREATE POLICY "Users can update tickets in their organization"
ON tickets
FOR UPDATE
TO authenticated
USING ((organization_id = get_user_organization()) AND 
       (current_user_has_role('admin'::app_role) OR 
        current_user_has_role('account_admin'::app_role) OR 
        current_user_has_role('supervisor'::app_role) OR 
        (auth.uid() = assigned_to)));

DROP POLICY IF EXISTS "Users can view tickets in their organization" ON tickets;
CREATE POLICY "Users can view tickets in their organization"
ON tickets
FOR SELECT
TO authenticated
USING ((organization_id = get_user_organization()) AND 
       (current_user_has_role('admin'::app_role) OR 
        current_user_has_role('account_admin'::app_role) OR 
        current_user_has_role('supervisor'::app_role) OR 
        current_user_has_role('agent'::app_role) OR 
        (auth.uid() = assigned_to) OR 
        (auth.uid() = created_by)));

-- Update user_roles policies to allow supervisors to view some roles
DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;
CREATE POLICY "Admins can view all user roles"
ON user_roles
FOR SELECT
TO authenticated
USING (current_user_has_role('admin'::app_role) OR current_user_has_role('account_admin'::app_role));

DROP POLICY IF EXISTS "HR can view all user roles" ON user_roles;
CREATE POLICY "Supervisors can view some user roles"
ON user_roles
FOR SELECT
TO authenticated
USING (current_user_has_role('supervisor'::app_role) AND role IN ('agent'::app_role, 'supervisor'::app_role));

DROP POLICY IF EXISTS "Admins can insert user roles" ON user_roles;
CREATE POLICY "Admins can insert user roles"
ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (current_user_has_role('admin'::app_role) OR current_user_has_role('account_admin'::app_role));

DROP POLICY IF EXISTS "Admins can update user roles" ON user_roles;
CREATE POLICY "Admins can update user roles"
ON user_roles
FOR UPDATE
TO authenticated
USING (current_user_has_role('admin'::app_role) OR current_user_has_role('account_admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete user roles" ON user_roles;
CREATE POLICY "Admins can delete user roles"
ON user_roles
FOR DELETE
TO authenticated
USING (current_user_has_role('admin'::app_role) OR current_user_has_role('account_admin'::app_role));