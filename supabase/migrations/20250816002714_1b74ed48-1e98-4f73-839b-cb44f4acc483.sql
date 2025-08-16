-- Create a system organization for super admins and make user a super admin

DO $$
DECLARE
  target_user_id uuid;
  system_org_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- Find user by email from auth.users
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = 'info@bernsergsolutions.com';
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email info@bernsergsolutions.com not found';
  END IF;
  
  -- Create system organization if it doesn't exist
  INSERT INTO public.organizations (id, name, slug, subscription_status, max_users)
  VALUES (system_org_id, 'System', 'system', 'active', 999999)
  ON CONFLICT (id) DO NOTHING;
  
  -- Make the user a super admin
  INSERT INTO public.organization_admins (user_id, organization_id, role)
  VALUES (target_user_id, system_org_id, 'super_admin')
  ON CONFLICT (user_id, organization_id) 
  DO UPDATE SET role = 'super_admin';
  
  RAISE NOTICE 'Successfully made user info@bernsergsolutions.com (%) a super admin', target_user_id;
END $$;