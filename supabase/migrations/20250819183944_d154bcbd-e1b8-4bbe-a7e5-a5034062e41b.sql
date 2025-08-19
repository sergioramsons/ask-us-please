-- Broaden management policy to include profiles role admin and add WITH CHECK
CREATE POLICY IF NOT EXISTS "Profiles admins can manage incoming mail servers" 
ON public.incoming_mail_servers 
FOR ALL 
USING (
  organization_id IN (
    SELECT p.organization_id FROM profiles p 
    WHERE p.user_id = auth.uid() AND p.role = ANY(ARRAY['admin','super_admin'])
  )
)
WITH CHECK (
  organization_id IN (
    SELECT p.organization_id FROM profiles p 
    WHERE p.user_id = auth.uid() AND p.role = ANY(ARRAY['admin','super_admin'])
  )
);

-- Add explicit INSERT policy with WITH CHECK using user_roles as well
CREATE POLICY IF NOT EXISTS "User roles admins can insert incoming mail servers" 
ON public.incoming_mail_servers 
FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT ur.organization_id FROM user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = ANY(ARRAY['admin','super_admin'])
  )
);
