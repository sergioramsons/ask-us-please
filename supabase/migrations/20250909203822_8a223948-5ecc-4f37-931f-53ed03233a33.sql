-- Update existing organization to be the default single-tenant org
-- First find the existing organization
UPDATE public.organizations 
SET name = 'Helpdesk System',
    subdomain = 'main',
    slug = 'main'
WHERE subdomain = 'default'
LIMIT 1;

-- Get the first organization ID to use as our single tenant org
DO $$
DECLARE
    org_id uuid;
BEGIN
    SELECT id INTO org_id FROM public.organizations LIMIT 1;
    
    -- Update all records to use this organization
    UPDATE public.profiles SET organization_id = org_id WHERE organization_id != org_id OR organization_id IS NULL;
    UPDATE public.tickets SET organization_id = org_id WHERE organization_id != org_id OR organization_id IS NULL;
    UPDATE public.contacts SET organization_id = org_id WHERE organization_id != org_id OR organization_id IS NULL;
    UPDATE public.companies SET organization_id = org_id WHERE organization_id != org_id OR organization_id IS NULL;
    UPDATE public.departments SET organization_id = org_id WHERE organization_id != org_id OR organization_id IS NULL;
    UPDATE public.groups SET organization_id = org_id WHERE organization_id != org_id OR organization_id IS NULL;
    UPDATE public.tags SET organization_id = org_id WHERE organization_id != org_id OR organization_id IS NULL;
    UPDATE public.tag_categories SET organization_id = org_id WHERE organization_id != org_id OR organization_id IS NULL;
    UPDATE public.entity_tags SET organization_id = org_id WHERE organization_id != org_id OR organization_id IS NULL;
    UPDATE public.email_servers SET organization_id = org_id WHERE organization_id != org_id OR organization_id IS NULL;
    UPDATE public.incoming_emails SET organization_id = org_id WHERE organization_id != org_id OR organization_id IS NULL;
    UPDATE public.agent_availability SET organization_id = org_id WHERE organization_id != org_id OR organization_id IS NULL;
    UPDATE public.agent_skills SET organization_id = org_id WHERE organization_id != org_id OR organization_id IS NULL;
END $$;