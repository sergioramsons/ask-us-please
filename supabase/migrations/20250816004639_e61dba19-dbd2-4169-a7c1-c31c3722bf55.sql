-- Add function to resolve organization by subdomain and update constraints

-- Add constraint for domain_type if not exists
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.organization_domains 
    ADD CONSTRAINT check_domain_type CHECK (domain_type IN ('exact', 'wildcard', 'subdomain'));
  EXCEPTION
    WHEN duplicate_object THEN
      -- Constraint already exists, ignore
      NULL;
  END;
END $$;

-- Add function to resolve organization by subdomain
CREATE OR REPLACE FUNCTION public.resolve_organization_by_subdomain(hostname text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  org_id uuid;
  subdomain text;
  base_domain text;
BEGIN
  -- Extract subdomain and base domain
  subdomain := split_part(hostname, '.', 1);
  base_domain := substring(hostname from position('.' in hostname) + 1);
  
  -- First try exact domain match
  SELECT organization_id INTO org_id
  FROM organization_domains 
  WHERE domain = hostname AND domain_type = 'exact'
  LIMIT 1;
  
  IF org_id IS NOT NULL THEN
    RETURN org_id;
  END IF;
  
  -- Try subdomain pattern match
  SELECT organization_id INTO org_id
  FROM organization_domains 
  WHERE domain_type = 'subdomain' 
    AND subdomain_pattern = subdomain
  LIMIT 1;
  
  IF org_id IS NOT NULL THEN
    RETURN org_id;
  END IF;
  
  -- Try wildcard domain match
  SELECT organization_id INTO org_id
  FROM organization_domains 
  WHERE domain_type = 'wildcard' 
    AND wildcard_domain = base_domain
  LIMIT 1;
  
  IF org_id IS NOT NULL THEN
    RETURN org_id;
  END IF;
  
  -- Try organization slug as subdomain
  SELECT id INTO org_id
  FROM organizations 
  WHERE slug = subdomain
  LIMIT 1;
  
  RETURN org_id;
END;
$$;

-- Add indexes for subdomain resolution performance
CREATE INDEX IF NOT EXISTS idx_organization_domains_subdomain ON public.organization_domains(subdomain_pattern) WHERE domain_type = 'subdomain';
CREATE INDEX IF NOT EXISTS idx_organization_domains_wildcard ON public.organization_domains(wildcard_domain) WHERE domain_type = 'wildcard';
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);