-- Fix infinite recursion in profiles RLS policy
-- Create security definer function to get current user's organization_id
CREATE OR REPLACE FUNCTION public.get_current_user_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Drop the existing policy that causes infinite recursion
DROP POLICY IF EXISTS "Profiles are viewable by organization members only" ON public.profiles;

-- Create new policy using the security definer function
CREATE POLICY "Profiles are viewable by organization members only"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  (organization_id = public.get_current_user_organization_id())
);