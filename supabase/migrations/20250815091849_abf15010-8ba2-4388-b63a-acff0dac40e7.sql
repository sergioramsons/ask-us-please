-- Assign admin role to the current user (replace with your email)
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::app_role
FROM public.profiles 
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'info@bernsergsolutions.com'
)
ON CONFLICT (user_id, role) DO NOTHING;