-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Organization admins can manage incoming mail servers" ON public.incoming_mail_servers;

-- Add explicit INSERT policy with WITH CHECK using user_roles  
CREATE POLICY "User roles admins can insert incoming mail servers" 
ON public.incoming_mail_servers 
FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT ur.organization_id FROM user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = ANY(ARRAY['admin','super_admin'])
  )
);

-- Add explicit INSERT policy with WITH CHECK using profiles
CREATE POLICY "Profiles admins can insert incoming mail servers" 
ON public.incoming_mail_servers 
FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT p.organization_id FROM profiles p 
    WHERE p.user_id = auth.uid() AND p.role = ANY(ARRAY['admin','super_admin'])
  )
);

-- Add UPDATE policy using user_roles
CREATE POLICY "User roles admins can update incoming mail servers" 
ON public.incoming_mail_servers 
FOR UPDATE
USING (
  organization_id IN (
    SELECT ur.organization_id FROM user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = ANY(ARRAY['admin','super_admin'])
  )
);

-- Add DELETE policy using user_roles
CREATE POLICY "User roles admins can delete incoming mail servers" 
ON public.incoming_mail_servers 
FOR DELETE
USING (
  organization_id IN (
    SELECT ur.organization_id FROM user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = ANY(ARRAY['admin','super_admin'])
  )
);

-- Add UPDATE policy using profiles  
CREATE POLICY "Profiles admins can update incoming mail servers" 
ON public.incoming_mail_servers 
FOR UPDATE
USING (
  organization_id IN (
    SELECT p.organization_id FROM profiles p 
    WHERE p.user_id = auth.uid() AND p.role = ANY(ARRAY['admin','super_admin'])
  )
);

-- Add DELETE policy using profiles  
CREATE POLICY "Profiles admins can delete incoming mail servers" 
ON public.incoming_mail_servers 
FOR DELETE
USING (
  organization_id IN (
    SELECT p.organization_id FROM profiles p 
    WHERE p.user_id = auth.uid() AND p.role = ANY(ARRAY['admin','super_admin'])
  )
);