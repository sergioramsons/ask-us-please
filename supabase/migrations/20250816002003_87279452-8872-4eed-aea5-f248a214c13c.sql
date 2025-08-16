-- Bootstrap first super admin user
-- This migration should be run once to create the first super admin

DO $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get the current authenticated user ID
  current_user_id := auth.uid();
  
  -- If there's a current user, make them a super admin
  IF current_user_id IS NOT NULL THEN
    -- Insert or update the user as a super admin
    INSERT INTO public.organization_admins (user_id, organization_id, role)
    VALUES (current_user_id, '00000000-0000-0000-0000-000000000000'::uuid, 'super_admin')
    ON CONFLICT (user_id, organization_id) 
    DO UPDATE SET role = 'super_admin';
    
    RAISE NOTICE 'Successfully made user % a super admin', current_user_id;
  ELSE
    RAISE NOTICE 'No authenticated user found. Please log in and run this migration again.';
  END IF;
END $$;