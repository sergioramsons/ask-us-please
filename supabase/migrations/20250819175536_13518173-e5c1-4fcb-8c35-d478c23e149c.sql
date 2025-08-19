-- 1) Create RPC to resolve organization by hostname/subdomain
CREATE OR REPLACE FUNCTION public.resolve_organization_by_subdomain(hostname text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  host text := lower(hostname);
  sub text;
  org_id uuid;
BEGIN
  -- Direct domain match
  SELECT id INTO org_id
  FROM public.organizations
  WHERE domain IS NOT NULL AND lower(domain) = host
  LIMIT 1;

  IF org_id IS NOT NULL THEN
    RETURN org_id;
  END IF;

  -- Extract first label as subdomain and match (ignore www)
  sub := split_part(host, '.', 1);
  IF sub = 'www' THEN
    sub := split_part(host, '.', 2);
  END IF;

  IF sub IS NOT NULL AND sub <> '' THEN
    SELECT id INTO org_id
    FROM public.organizations
    WHERE subdomain IS NOT NULL AND lower(subdomain) = lower(sub)
    LIMIT 1;

    IF org_id IS NOT NULL THEN
      RETURN org_id;
    END IF;
  END IF;

  -- Fallback: if there's only one org, return it (useful for dev/sandbox)
  SELECT id INTO org_id
  FROM public.organizations
  ORDER BY created_at ASC
  LIMIT 1;

  RETURN org_id; -- may be null if none exists
END;
$$;

-- 2) Create organization_admins table to support admin lookups and embedding
CREATE TABLE IF NOT EXISTS public.organization_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin','super_admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

ALTER TABLE public.organization_admins ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own admin links
CREATE POLICY IF NOT EXISTS "Users can view their own org admin links"
ON public.organization_admins
FOR SELECT
USING (auth.uid() = user_id);

-- 3) Keep organization_admins in sync with user_roles
CREATE OR REPLACE FUNCTION public.sync_organization_admins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.organization_id IS NOT NULL AND NEW.role IN ('admin','super_admin') THEN
      INSERT INTO public.organization_admins (user_id, organization_id, role)
      VALUES (NEW.user_id, NEW.organization_id, CASE WHEN NEW.role = 'super_admin' THEN 'super_admin' ELSE 'admin' END)
      ON CONFLICT (user_id, organization_id)
      DO UPDATE SET role = EXCLUDED.role;
    ELSE
      -- Remove admin link if role no longer admin
      DELETE FROM public.organization_admins
      WHERE user_id = NEW.user_id
        AND organization_id = COALESCE(NEW.organization_id, OLD.organization_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.organization_admins
    WHERE user_id = OLD.user_id
      AND organization_id = OLD.organization_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_org_admins ON public.user_roles;
CREATE TRIGGER trg_sync_org_admins
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.sync_organization_admins();

-- 4) Add uniqueness to user_roles to prevent duplicates
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_roles_user_org_role_key'
  ) THEN
    ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_user_org_role_key UNIQUE (user_id, organization_id, role);
  END IF;
END $$;

-- 5) Seed a default organization and backfill profiles and admin role for existing users
WITH upsert_org AS (
  INSERT INTO public.organizations (name, subdomain, settings)
  VALUES ('Sandbox Org', 'sandbox', '{}'::jsonb)
  ON CONFLICT (subdomain) DO UPDATE SET name = EXCLUDED.name
  RETURNING id
), picked_org AS (
  SELECT id FROM upsert_org
  UNION ALL
  SELECT id FROM public.organizations WHERE subdomain = 'sandbox' LIMIT 1
)
-- Backfill profiles
INSERT INTO public.profiles (user_id, organization_id, display_name, email, role)
SELECT au.id,
       (SELECT id FROM picked_org),
       COALESCE(au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1)),
       au.email,
       'admin'
FROM auth.users au
ON CONFLICT (user_id)
DO UPDATE SET organization_id = EXCLUDED.organization_id
;

-- Backfill user_roles (super_admin)
INSERT INTO public.user_roles (user_id, organization_id, role)
SELECT au.id,
       (SELECT id FROM picked_org),
       'super_admin'
FROM auth.users au
ON CONFLICT ON CONSTRAINT user_roles_user_org_role_key DO NOTHING;

-- Backfill organization_admins from user_roles
INSERT INTO public.organization_admins (user_id, organization_id, role)
SELECT ur.user_id, ur.organization_id,
       CASE WHEN ur.role = 'super_admin' THEN 'super_admin' ELSE 'admin' END
FROM public.user_roles ur
LEFT JOIN public.organization_admins oa
  ON oa.user_id = ur.user_id AND oa.organization_id = ur.organization_id
WHERE oa.user_id IS NULL AND ur.organization_id IS NOT NULL AND ur.role IN ('admin','super_admin');

-- 6) Auto-create profiles on new user signup (and attach to default org if exists)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_org uuid;
BEGIN
  SELECT id INTO default_org FROM public.organizations WHERE subdomain = 'sandbox' LIMIT 1;

  INSERT INTO public.profiles (user_id, organization_id, display_name, email, role)
  VALUES (
    NEW.id,
    default_org,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'agent'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();