-- Add support for multiple domains per organization

-- Create organization_domains table to store multiple domains
CREATE TABLE public.organization_domains (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  dns_records jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(domain),
  UNIQUE(organization_id, is_primary) -- Only one primary domain per org
);

-- Enable RLS on organization_domains
ALTER TABLE public.organization_domains ENABLE ROW LEVEL SECURITY;

-- Create policies for organization_domains
CREATE POLICY "Super admins can manage all organization domains"
ON public.organization_domains
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Organization admins can view domains in their organization"
ON public.organization_domains
FOR SELECT
USING (is_organization_admin(organization_id));

-- Add trigger for updated_at
CREATE TRIGGER update_organization_domains_updated_at
BEFORE UPDATE ON public.organization_domains
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing domains from organizations table to organization_domains
INSERT INTO public.organization_domains (organization_id, domain, is_primary, is_verified)
SELECT id, domain, true, true
FROM public.organizations 
WHERE domain IS NOT NULL AND domain != '';

-- Add indexes for performance
CREATE INDEX idx_organization_domains_org_id ON public.organization_domains(organization_id);
CREATE INDEX idx_organization_domains_domain ON public.organization_domains(domain);
CREATE INDEX idx_organization_domains_primary ON public.organization_domains(organization_id, is_primary) WHERE is_primary = true;