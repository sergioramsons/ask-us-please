-- Fix email server password security - handle existing policies properly

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Admins can view email server configs" ON public.email_servers;
DROP POLICY IF EXISTS "Admins can view incoming mail server configs" ON public.incoming_mail_servers;

-- Remove the overly restrictive policies that block all access
DROP POLICY IF EXISTS "Email server passwords hidden from direct access" ON public.email_servers;
DROP POLICY IF EXISTS "Incoming mail passwords hidden from direct access" ON public.incoming_mail_servers;

-- Create proper RLS policies that allow admins to manage servers
CREATE POLICY "Admins can view email server configs" 
ON public.email_servers 
FOR SELECT 
USING (current_user_has_role('admin'::app_role));

CREATE POLICY "Admins can view incoming mail server configs" 
ON public.incoming_mail_servers 
FOR SELECT 
USING (current_user_has_role('admin'::app_role));

-- Drop and recreate the secure views without security definer properties
DROP VIEW IF EXISTS public.email_servers_secure;
DROP VIEW IF EXISTS public.incoming_mail_servers_secure;

-- Create regular views for secure access (passwords will be encrypted)
CREATE VIEW public.email_servers_secure AS
SELECT 
  id,
  name,
  smtp_host,
  smtp_port,
  smtp_username,
  sender_email,
  sender_name,
  reply_to,
  use_tls,
  is_active,
  password_encrypted,
  created_at,
  updated_at,
  -- Show encryption status instead of actual password
  CASE 
    WHEN password_appears_encrypted(smtp_password) THEN '***encrypted***'
    ELSE '***unencrypted***'
  END as password_status
FROM public.email_servers;

CREATE VIEW public.incoming_mail_servers_secure AS
SELECT 
  id,
  name,
  server_type,
  host,
  port,
  username,
  folder_name,
  use_ssl,
  use_tls,
  is_active,
  auto_process,
  check_interval,
  delete_after_process,
  auto_create_tickets,
  auto_assign_department,
  last_check,
  password_encrypted,
  created_at,
  updated_at,
  -- Show encryption status instead of actual password
  CASE 
    WHEN password_appears_encrypted(password) THEN '***encrypted***'
    ELSE '***unencrypted***'
  END as password_status
FROM public.incoming_mail_servers;

-- Grant access to the secure views
GRANT SELECT ON public.email_servers_secure TO authenticated;
GRANT SELECT ON public.incoming_mail_servers_secure TO authenticated;