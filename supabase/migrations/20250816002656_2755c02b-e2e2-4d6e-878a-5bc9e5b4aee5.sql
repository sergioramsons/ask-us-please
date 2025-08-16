-- Make info@bernsergsolutions.com a super admin

DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Find user by email from auth.users
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = 'info@bernsergsolutions.com';
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email info@bernsergsolutions.com not found';
  END IF;
  
  -- Insert or update the user as a super admin
  INSERT INTO public.organization_admins (user_id, organization_id, role)
  VALUES (target_user_id, '00000000-0000-0000-0000-000000000000'::uuid, 'super_admin')
  ON CONFLICT (user_id, organization_id) 
  DO UPDATE SET role = 'super_admin';
  
  RAISE NOTICE 'Successfully made user info@bernsergsolutions.com (%) a super admin', target_user_id;
END $$;