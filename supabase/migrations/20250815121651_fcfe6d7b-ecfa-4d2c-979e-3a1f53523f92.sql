-- Fix critical security vulnerability: Restrict contact data access
-- Remove the overly permissive "Everyone can view contacts" policy
DROP POLICY IF EXISTS "Everyone can view contacts" ON public.contacts;

-- Create a more secure policy that only allows authenticated users to view contacts
CREATE POLICY "Authenticated users can view contacts" 
ON public.contacts 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Optional: Create an additional policy for admins to have full access
CREATE POLICY "Admins have full contact access" 
ON public.contacts 
FOR SELECT 
USING (current_user_has_role('admin'::app_role));