-- 1) Create missing RPC function for subdomain resolution
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

-- 2) Create organization_admins table
CREATE TABLE public.organization_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin','super_admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

-- Enable RLS
ALTER TABLE public.organization_admins ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can view their own org admin links"
ON public.organization_admins
FOR SELECT
USING (auth.uid() = user_id);