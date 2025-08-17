-- Step 2: Update existing user roles to use Freshdesk-style naming
-- Convert 'user' to 'agent', 'moderator' to 'supervisor'
UPDATE public.user_roles 
SET role = 'agent'::app_role 
WHERE role = 'user'::app_role;

UPDATE public.user_roles 
SET role = 'supervisor'::app_role 
WHERE role = 'moderator'::app_role;

-- Update RLS policies to use new roles but still support old ones during transition
DROP POLICY IF EXISTS "Admins can manage departments in their organization" ON departments;
CREATE POLICY "Admins can manage departments in their organization"
ON departments
FOR ALL
TO authenticated
USING ((organization_id = get_user_organization()) AND (
  current_user_has_role('admin'::app_role) OR 
  current_user_has_role('account_admin'::app_role)
))
WITH CHECK ((
  current_user_has_role('admin'::app_role) OR 
  current_user_has_role('account_admin'::app_role)
));

-- Update tickets policies to include supervisors and agents
DROP POLICY IF EXISTS "Users can update tickets in their organization" ON tickets;
CREATE POLICY "Users can update tickets in their organization"
ON tickets
FOR UPDATE
TO authenticated
USING ((organization_id = get_user_organization()) AND 
       (current_user_has_role('admin'::app_role) OR 
        current_user_has_role('account_admin'::app_role) OR 
        current_user_has_role('supervisor'::app_role) OR 
        current_user_has_role('moderator'::app_role) OR -- keeping old role for compatibility
        (auth.uid() = assigned_to)));

DROP POLICY IF EXISTS "Users can view tickets in their organization" ON tickets;
CREATE POLICY "Users can view tickets in their organization"
ON tickets
FOR SELECT
TO authenticated
USING ((organization_id = get_user_organization()) AND 
       (current_user_has_role('admin'::app_role) OR 
        current_user_has_role('account_admin'::app_role) OR 
        current_user_has_role('supervisor'::app_role) OR 
        current_user_has_role('moderator'::app_role) OR -- keeping old role for compatibility
        current_user_has_role('agent'::app_role) OR 
        current_user_has_role('user'::app_role) OR -- keeping old role for compatibility
        (auth.uid() = assigned_to) OR 
        (auth.uid() = created_by)));