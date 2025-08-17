-- Create a default organization for the current user
INSERT INTO public.organizations (name, slug, subscription_status, max_users)
VALUES ('My Organization', 'my-org', 'active', 50)
ON CONFLICT (slug) DO NOTHING;

-- Create or update the user's profile with the organization
INSERT INTO public.profiles (user_id, display_name, organization_id)
SELECT 
  auth.uid(),
  'User',
  (SELECT id FROM organizations WHERE slug = 'my-org' LIMIT 1)
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id) 
DO UPDATE SET 
  organization_id = (SELECT id FROM organizations WHERE slug = 'my-org' LIMIT 1)
WHERE profiles.organization_id IS NULL;

-- Make the current user an admin of their organization
INSERT INTO public.organization_admins (user_id, organization_id, role)
SELECT 
  auth.uid(),
  (SELECT id FROM organizations WHERE slug = 'my-org' LIMIT 1),
  'admin'
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;