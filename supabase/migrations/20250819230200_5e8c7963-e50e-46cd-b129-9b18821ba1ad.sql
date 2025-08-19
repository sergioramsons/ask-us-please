-- Fix user_roles RLS policies to allow proper user role assignment

-- First, drop the existing problematic policies
DROP POLICY IF EXISTS "Organization admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "User roles are viewable by organization members" ON public.user_roles;

-- Create a security definer function to check admin status without circular dependency
CREATE OR REPLACE FUNCTION public.is_organization_admin(check_user_id uuid, check_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    WHERE ur.user_id = check_user_id 
      AND ur.organization_id = check_org_id
      AND ur.role IN ('admin', 'super_admin')
  );
$$;

-- Create more flexible RLS policies
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Organization members can view roles in their org" 
ON public.user_roles 
FOR SELECT 
USING (
  organization_id IN (
    SELECT p.organization_id
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
  )
);

-- Allow admins to manage user roles in their organization
CREATE POLICY "Organization admins can manage user roles" 
ON public.user_roles 
FOR ALL 
USING (
  public.is_organization_admin(auth.uid(), organization_id)
);

-- Allow users to be assigned roles (for initial setup)
CREATE POLICY "Allow user role assignment" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  -- Either the user is assigning themselves OR an admin is assigning
  auth.uid() = user_id OR 
  public.is_organization_admin(auth.uid(), organization_id)
);