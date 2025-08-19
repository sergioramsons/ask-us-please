-- 3) Add default data and admin privileges
-- Create a default organization if it doesn't exist
INSERT INTO public.organizations (name, subdomain, settings)
VALUES ('Default Organization', 'default', '{}')
ON CONFLICT (subdomain) DO NOTHING;

-- Get the default org ID
DO $$
DECLARE
  default_org_id uuid;
  user_record record;
BEGIN
  -- Get default organization
  SELECT id INTO default_org_id FROM public.organizations WHERE subdomain = 'default' LIMIT 1;
  
  -- Create profiles for any users without them, and link to default org
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.user_id = au.id
    WHERE p.user_id IS NULL
  LOOP
    INSERT INTO public.profiles (user_id, organization_id, display_name, email, role)
    VALUES (
      user_record.id,
      default_org_id,
      COALESCE(user_record.raw_user_meta_data->>'display_name', split_part(user_record.email, '@', 1)),
      user_record.email,
      'admin'
    );
    
    -- Give admin role
    INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES (user_record.id, default_org_id, 'admin')
    ON CONFLICT DO NOTHING;
    
    -- Add to organization_admins
    INSERT INTO public.organization_admins (user_id, organization_id, role)
    VALUES (user_record.id, default_org_id, 'admin')
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  -- Update existing profiles to have default org if they don't have one
  UPDATE public.profiles 
  SET organization_id = default_org_id
  WHERE organization_id IS NULL;
END $$;