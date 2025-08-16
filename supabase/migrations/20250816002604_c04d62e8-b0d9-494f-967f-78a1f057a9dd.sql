-- Create a function to make any authenticated user a super admin
-- This is helpful for initial setup

CREATE OR REPLACE FUNCTION public.make_super_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Find user by email from auth.users
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Insert or update the user as a super admin
  INSERT INTO public.organization_admins (user_id, organization_id, role)
  VALUES (target_user_id, '00000000-0000-0000-0000-000000000000'::uuid, 'super_admin')
  ON CONFLICT (user_id, organization_id) 
  DO UPDATE SET role = 'super_admin';
  
  RAISE NOTICE 'Successfully made user % (%) a super admin', user_email, target_user_id;
END;
$$;