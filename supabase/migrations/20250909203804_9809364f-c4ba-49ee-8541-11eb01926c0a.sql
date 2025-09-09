-- Fix the organization constraint issue by creating default organization first
-- Create a default organization record if it doesn't exist
INSERT INTO public.organizations (id, name, subdomain, domain, slug, subscription_status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default', null, 'default', 'active')
ON CONFLICT (id) DO NOTHING;

-- Now update all records to use the default organization
UPDATE public.profiles SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.tickets SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.contacts SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.companies SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.departments SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.groups SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.tags SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.tag_categories SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.entity_tags SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.email_servers SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.incoming_emails SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.agent_availability SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';
UPDATE public.agent_skills SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000001';