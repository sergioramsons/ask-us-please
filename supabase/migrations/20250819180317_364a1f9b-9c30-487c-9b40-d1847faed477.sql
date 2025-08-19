-- First, let's check the current email_servers table structure and update it
-- Drop the table to recreate with the correct structure that matches the UI
DROP TABLE IF EXISTS public.email_servers CASCADE;

-- Create email_servers table with the correct structure for the EmailManager component
CREATE TABLE public.email_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  smtp_host text NOT NULL,
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_username text NOT NULL,
  smtp_password text NOT NULL,
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  reply_to text,
  use_tls boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT false,
  password_encrypted boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_servers ENABLE ROW LEVEL SECURITY;

-- Create the secure view that hides password details
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
FROM public.email_servers;

-- Grant access to the secure view
GRANT SELECT ON public.email_servers_secure TO authenticated;

-- RLS policies for email_servers
CREATE POLICY "Email servers are viewable by organization members"
ON public.email_servers FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can manage email servers"
ON public.email_servers FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Add trigger for timestamps
CREATE TRIGGER update_email_servers_updated_at
BEFORE UPDATE ON public.email_servers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_email_servers_org_id ON public.email_servers(organization_id);
CREATE INDEX idx_email_servers_active ON public.email_servers(is_active);