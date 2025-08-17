-- Check if super admin role exists and create it if not
INSERT INTO public.organization_admins (user_id, organization_id, role)
SELECT 
  '8e41a122-621b-4351-947d-bf08e1e51d84'::uuid,
  (SELECT id FROM public.organizations WHERE slug = 'system' LIMIT 1),
  'super_admin'
ON CONFLICT (user_id, organization_id) 
DO UPDATE SET role = 'super_admin';