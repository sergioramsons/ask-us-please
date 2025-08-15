-- Fix critical security vulnerability: Restrict contact access to user-specific data
-- Remove the overly permissive policy that allows any authenticated user to view all contacts
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.contacts;

-- Create a more secure policy that only allows users to view contacts they created
CREATE POLICY "Users can view their own contacts" 
ON public.contacts 
FOR SELECT 
USING (auth.uid() = created_by);

-- Keep admin access policy (already exists but ensuring it's there)
-- Admins can still view all contacts for management purposes