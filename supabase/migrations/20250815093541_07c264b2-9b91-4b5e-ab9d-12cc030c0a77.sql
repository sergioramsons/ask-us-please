-- Add admin role to info@bernsergsolutions.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users 
WHERE email = 'info@bernsergsolutions.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the assignment was successful
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count
    FROM public.user_roles ur
    JOIN auth.users au ON ur.user_id = au.id
    WHERE au.email = 'info@bernsergsolutions.com' 
    AND ur.role = 'admin';
    
    IF user_count > 0 THEN
        RAISE NOTICE 'Admin role successfully assigned to info@bernsergsolutions.com';
    ELSE
        RAISE NOTICE 'Warning: Admin role assignment may have failed for info@bernsergsolutions.com';
    END IF;
END $$;