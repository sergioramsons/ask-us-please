-- Add missing columns to incoming_mail_servers table
ALTER TABLE public.incoming_mail_servers 
ADD COLUMN IF NOT EXISTS folder_name TEXT DEFAULT 'INBOX',
ADD COLUMN IF NOT EXISTS delete_after_process BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_assign_department UUID,
ADD COLUMN IF NOT EXISTS password_status TEXT DEFAULT 'encrypted';

-- Create a secure view for incoming_mail_servers (similar to email_servers_secure)
CREATE OR REPLACE VIEW public.incoming_mail_servers_secure AS
SELECT 
  id,
  organization_id,
  name,
  server_type,
  host,
  port,
  username,
  CASE 
    WHEN password_encrypted = true THEN '***encrypted***'
    ELSE password
  END as password,
  password_status,
  use_ssl,
  use_tls,
  is_active,
  password_encrypted,
  check_interval_minutes,
  last_check,
  created_at,
  updated_at,
  auto_create_tickets,
  auto_process,
  check_interval,
  folder_name,
  delete_after_process,
  auto_assign_department
FROM public.incoming_mail_servers;

-- Grant access to the secure view
GRANT SELECT ON public.incoming_mail_servers_secure TO authenticated;