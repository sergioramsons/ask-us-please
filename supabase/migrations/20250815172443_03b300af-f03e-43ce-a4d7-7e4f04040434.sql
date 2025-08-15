-- Create table for incoming mail server configurations
CREATE TABLE public.incoming_mail_servers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  server_type TEXT NOT NULL CHECK (server_type IN ('imap', 'pop3')),
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 993,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  use_ssl BOOLEAN NOT NULL DEFAULT true,
  use_tls BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT false,
  auto_process BOOLEAN NOT NULL DEFAULT true,
  check_interval INTEGER NOT NULL DEFAULT 5, -- minutes
  folder_name TEXT DEFAULT 'INBOX', -- for IMAP
  delete_after_process BOOLEAN NOT NULL DEFAULT false,
  auto_create_tickets BOOLEAN NOT NULL DEFAULT true,
  auto_assign_department UUID REFERENCES public.departments(id),
  password_encrypted BOOLEAN NOT NULL DEFAULT false,
  last_check TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incoming_mail_servers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for incoming_mail_servers
CREATE POLICY "Only admins can view incoming mail servers" 
ON public.incoming_mail_servers 
FOR SELECT 
USING (current_user_has_role('admin'::app_role));

CREATE POLICY "Only admins can create incoming mail servers" 
ON public.incoming_mail_servers 
FOR INSERT 
WITH CHECK (current_user_has_role('admin'::app_role));

CREATE POLICY "Only admins can update incoming mail servers" 
ON public.incoming_mail_servers 
FOR UPDATE 
USING (current_user_has_role('admin'::app_role));

CREATE POLICY "Only admins can delete incoming mail servers" 
ON public.incoming_mail_servers 
FOR DELETE 
USING (current_user_has_role('admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_incoming_mail_servers_active ON public.incoming_mail_servers(is_active);
CREATE INDEX idx_incoming_mail_servers_check_interval ON public.incoming_mail_servers(check_interval);

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_incoming_mail_servers_updated_at
  BEFORE UPDATE ON public.incoming_mail_servers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();