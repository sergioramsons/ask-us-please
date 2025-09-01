-- Drop all existing policies on departments table
DROP POLICY IF EXISTS "Organization members can view departments" ON public.departments;
DROP POLICY IF EXISTS "Departments are viewable by organization members" ON public.departments;
DROP POLICY IF EXISTS "Organization admins can manage departments" ON public.departments;

-- Create new clearer policies
CREATE POLICY "departments_select_policy" 
ON public.departments 
FOR SELECT 
USING (
  organization_id IN (
    SELECT profiles.organization_id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
  )
);

CREATE POLICY "departments_insert_policy" 
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

CREATE POLICY "departments_update_policy" 
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

CREATE POLICY "departments_delete_policy" 
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