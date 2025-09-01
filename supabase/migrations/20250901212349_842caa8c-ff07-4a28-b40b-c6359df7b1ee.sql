-- Create a more permissive INSERT policy for departments
-- Allow organization members to create departments, not just admins
CREATE POLICY "Organization members can create departments" 
ON public.departments 
FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT profiles.organization_id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
  )
);