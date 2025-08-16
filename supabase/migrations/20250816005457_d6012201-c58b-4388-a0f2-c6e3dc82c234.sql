-- Add macaw subdomain configuration for Macaw Comm organization

INSERT INTO public.organization_domains (
  organization_id, 
  domain, 
  domain_type, 
  subdomain_pattern,
  is_primary, 
  is_verified
) VALUES (
  '4fa6d426-b739-46b4-a50a-fa1d7505b423', -- Macaw Comm organization ID
  'macaw.helpdesk.bernsergsolutions.com',
  'subdomain',
  'macaw',
  true,
  false -- Set to pending/unverified initially
)
ON CONFLICT (domain) 
DO UPDATE SET 
  organization_id = EXCLUDED.organization_id,
  domain_type = EXCLUDED.domain_type,
  subdomain_pattern = EXCLUDED.subdomain_pattern,
  is_primary = EXCLUDED.is_primary;