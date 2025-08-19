-- Backfill organization_id on user_roles and expand admin check

-- 1) Backfill missing organization_id using profiles mapping
UPDATE public.user_roles ur
SET organization_id = p.organization_id
FROM public.profiles p
WHERE ur.user_id = p.user_id
  AND ur.organization_id IS NULL
  AND p.organization_id IS NOT NULL;

-- 2) Expand admin check to include account_admin
CREATE OR REPLACE FUNCTION public.is_organization_admin(check_user_id uuid, check_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    WHERE ur.user_id = check_user_id 
      AND ur.organization_id = check_org_id
      AND ur.role IN ('admin', 'super_admin', 'account_admin')
  );
$$;