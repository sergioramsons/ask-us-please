-- Get current user email and make them super admin
DO $$
DECLARE
  current_email text;
BEGIN
  -- Get the current user's email
  SELECT email INTO current_email FROM auth.users WHERE id = auth.uid();
  
  -- Make the user super admin
  PERFORM public.make_super_admin(current_email);
  
  RAISE NOTICE 'Made user % a super admin', current_email;
END $$;