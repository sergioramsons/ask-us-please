-- Fix critical security vulnerability: Restrict profiles table access to organization members only
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a secure policy that only allows organization members to view profiles within their organization
CREATE POLICY "Profiles are viewable by organization members only" 
ON public.profiles 
FOR SELECT 
USING (
  -- Allow users to see their own profile
  (auth.uid() = user_id) 
  OR 
  -- Allow organization members to see other profiles within the same organization
  (
    organization_id IN (
      SELECT p.organization_id 
      FROM public.profiles p 
      WHERE p.user_id = auth.uid()
    )
  )
);

-- Also fix organizations table security issue
DROP POLICY IF EXISTS "Organizations are viewable by everyone" ON public.organizations;

CREATE POLICY "Organizations are viewable by members only" 
ON public.organizations 
FOR SELECT 
USING (
  id IN (
    SELECT p.organization_id 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid()
  )
);

-- Fix permissions table to require authentication
DROP POLICY IF EXISTS "Permissions are viewable by everyone" ON public.permissions;

CREATE POLICY "Permissions are viewable by authenticated users" 
ON public.permissions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);