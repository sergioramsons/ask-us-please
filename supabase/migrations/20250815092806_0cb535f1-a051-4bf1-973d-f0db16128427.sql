-- Fix the overly permissive profile visibility policy
-- Drop the existing policy that allows everyone to view all profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create restricted profile visibility policies following principle of least privilege
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.current_user_has_role('admin'));

CREATE POLICY "HR can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.current_user_has_role('moderator'));

-- Optional: Allow department managers to view their department members
-- (This would require implementing a manager_id field in departments table)
-- CREATE POLICY "Managers can view department members" 
-- ON public.profiles 
-- FOR SELECT 
-- USING (
--   EXISTS (
--     SELECT 1 FROM public.departments d 
--     WHERE d.manager_id = auth.uid() 
--     AND d.id = public.profiles.department_id
--   )
-- );

-- Update user_roles policies to be more restrictive as well
-- Drop and recreate the overly broad admin view policy
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;

CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (public.current_user_has_role('admin'));

CREATE POLICY "HR can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (public.current_user_has_role('moderator'));