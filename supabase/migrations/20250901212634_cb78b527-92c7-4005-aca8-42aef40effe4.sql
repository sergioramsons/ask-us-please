-- Drop the existing restrictive policy and create a more permissive one
DROP POLICY IF EXISTS "Organization admins can manage departments" ON public.departments;

-- Create separate policies for better clarity
CREATE POLICY "Organization members can view departments" 
ON public.departments 
FOR SELECT 
USING (
  organization_id IN (
    SELECT profiles.organization_id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can create departments" 
ON public.departments 
FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT user_roles.organization_id
    FROM user_roles
    WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'super_admin', 'Administrator', 'Account Administrator')
  )
);

CREATE POLICY "Organization admins can update departments" 
ON public.departments 
FOR UPDATE 
USING (
  organization_id IN (
    SELECT user_roles.organization_id
    FROM user_roles
    WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'super_admin', 'Administrator', 'Account Administrator')
  )
);

CREATE POLICY "Organization admins can delete departments" 
ON public.departments 
FOR DELETE 
USING (
  organization_id IN (
    SELECT user_roles.organization_id
    FROM user_roles
    WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'super_admin', 'Administrator', 'Account Administrator')
  )
);