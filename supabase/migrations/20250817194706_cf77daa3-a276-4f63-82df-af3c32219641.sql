-- Create a placeholder organization for super admins and make the user super admin
INSERT INTO public.organizations (id, name, slug, subscription_status, max_users)
VALUES ('00000000-0000-0000-0000-000000000000', 'System', 'system', 'active', 999999)
ON CONFLICT (id) DO NOTHING;

-- Now make the user super admin
SELECT public.make_super_admin('info@bernsergsolutions.com');