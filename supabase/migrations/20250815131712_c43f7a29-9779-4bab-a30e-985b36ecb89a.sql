-- Fix department access control security issue
-- Remove public access to departments and restrict to authenticated users only
DROP POLICY IF EXISTS "Everyone can view departments" ON public.departments;

-- Create secure policy for authenticated users only
CREATE POLICY "Authenticated users can view departments" 
ON public.departments 
FOR SELECT 
USING (auth.role() = 'authenticated');