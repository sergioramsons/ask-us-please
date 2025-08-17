-- Ensure a default organization exists (System)
INSERT INTO public.organizations (id, name, slug, subscription_status, max_users)
VALUES ('00000000-0000-0000-0000-000000000001', 'System', 'system', 'active', 999999)
ON CONFLICT (id) DO NOTHING;

-- Create or update the user's profile with the System org
INSERT INTO public.profiles (user_id, display_name, organization_id)
VALUES ('8e41a122-621b-4351-947d-bf08e1e51d84', 'User', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (user_id) DO UPDATE SET organization_id = EXCLUDED.organization_id;

-- Backfill all tickets with NULL org to System org so they are visible
UPDATE public.tickets
SET organization_id = '00000000-0000-0000-0000-000000000001',
    updated_at = now()
WHERE organization_id IS NULL;