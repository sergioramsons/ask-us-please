-- Update is_organization_admin to align with actual role names and organization roles
CREATE OR REPLACE FUNCTION public.is_organization_admin(check_user_id uuid, check_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- A user is an org admin if:
  -- 1) They have a role in user_roles that matches an organization_roles row with is_admin_role = true for this org, OR
  -- 2) They have one of the legacy admin role keys ('admin','super_admin','account_admin')
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    LEFT JOIN public.organization_roles orole
      ON orole.organization_id = ur.organization_id
     AND orole.role_name = ur.role
    WHERE ur.user_id = check_user_id
      AND ur.organization_id = check_org_id
      AND (
        COALESCE(orole.is_admin_role, false) = true
        OR lower(ur.role) IN ('admin','super_admin','account_admin')
      )
  );
$$;