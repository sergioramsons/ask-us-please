-- Fix the security definer view issue by recreating without SECURITY DEFINER
DROP VIEW IF EXISTS public.email_servers_secure;

-- Create the secure view with proper RLS instead of SECURITY DEFINER
CREATE VIEW public.email_servers_secure AS
SELECT 
  id,
  organization_id,
  name,
  smtp_host,
  smtp_port,
  smtp_username,
  CASE 
    WHEN smtp_password IS NOT NULL AND smtp_password != '' 
    THEN '••••••••' 
    ELSE NULL 
  END as smtp_password,
  CASE 
    WHEN smtp_password IS NOT NULL AND smtp_password != '' 
    THEN 'Encrypted' 
    ELSE 'Not Set' 
  END as password_status,
  sender_name,
  sender_email,
  reply_to,
  use_tls,
  is_active,
  password_encrypted,
  created_at,
  updated_at
FROM public.email_servers
WHERE organization_id IN (
  SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
);

-- Grant access to the secure view
GRANT SELECT ON public.email_servers_secure TO authenticated;