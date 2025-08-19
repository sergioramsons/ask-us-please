-- Create incoming_mail_servers table for POP3/IMAP configuration
CREATE TABLE public.incoming_mail_servers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  server_type TEXT NOT NULL DEFAULT 'pop3', -- 'pop3' or 'imap'
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 110,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  use_ssl BOOLEAN NOT NULL DEFAULT false,
  use_tls BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT false,
  password_encrypted BOOLEAN NOT NULL DEFAULT true,
  check_interval_minutes INTEGER NOT NULL DEFAULT 5,
  last_check TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on incoming_mail_servers
ALTER TABLE public.incoming_mail_servers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for incoming_mail_servers
CREATE POLICY "Incoming mail servers are viewable by organization members" 
ON public.incoming_mail_servers 
FOR SELECT 
USING (organization_id IN (
  SELECT profiles.organization_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Organization admins can manage incoming mail servers" 
ON public.incoming_mail_servers 
FOR ALL 
USING (organization_id IN (
  SELECT user_roles.organization_id
  FROM user_roles
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = ANY(ARRAY['admin'::text, 'super_admin'::text])
));

-- Add trigger for updated_at
CREATE TRIGGER update_incoming_mail_servers_updated_at
BEFORE UPDATE ON public.incoming_mail_servers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add check constraints
ALTER TABLE public.incoming_mail_servers
ADD CONSTRAINT check_server_type CHECK (server_type IN ('pop3', 'imap'));

ALTER TABLE public.incoming_mail_servers
ADD CONSTRAINT check_port_range CHECK (port > 0 AND port <= 65535);