-- Update departments table to auto-set organization_id
CREATE OR REPLACE FUNCTION set_org_id_departments()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id = get_user_organization();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-set organization_id for departments
DROP TRIGGER IF EXISTS trigger_set_org_id_departments ON departments;
CREATE TRIGGER trigger_set_org_id_departments
  BEFORE INSERT ON departments
  FOR EACH ROW
  EXECUTE FUNCTION set_org_id_departments();

-- Also update the RLS policy to allow creation without requiring organization_id in the WITH CHECK
DROP POLICY IF EXISTS "Admins can manage departments in their organization" ON departments;

CREATE POLICY "Admins can manage departments in their organization"
ON departments
FOR ALL
TO authenticated
USING ((organization_id = get_user_organization()) AND current_user_has_role('admin'::app_role))
WITH CHECK (current_user_has_role('admin'::app_role));