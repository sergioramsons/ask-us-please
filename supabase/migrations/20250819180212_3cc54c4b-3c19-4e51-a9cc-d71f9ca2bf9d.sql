-- Create email server configuration tables
CREATE TABLE public.email_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  server_type text NOT NULL CHECK (server_type IN ('incoming', 'outgoing')),
  host text NOT NULL,
  port integer NOT NULL,
  username text NOT NULL,
  password text NOT NULL,
  encryption text NOT NULL CHECK (encryption IN ('none', 'ssl', 'tls', 'starttls')),
  protocol text CHECK (protocol IN ('pop3', 'imap', 'smtp')),
  is_active boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  sync_frequency integer DEFAULT 300, -- seconds
  settings jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create incoming emails table for processing
CREATE TABLE public.incoming_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email_server_id uuid REFERENCES public.email_servers(id) ON DELETE SET NULL,
  message_id text NOT NULL,
  from_email text NOT NULL,
  from_name text,
  to_email text NOT NULL,
  subject text NOT NULL,
  body_text text,
  body_html text,
  raw_email text,
  headers jsonb DEFAULT '{}',
  attachments jsonb DEFAULT '[]',
  ticket_id uuid REFERENCES public.tickets(id),
  processed boolean NOT NULL DEFAULT false,
  processing_error text,
  received_at timestamptz NOT NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create email templates table
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  template_type text NOT NULL CHECK (template_type IN ('ticket_created', 'ticket_updated', 'ticket_closed', 'auto_reply', 'notification')),
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text,
  variables jsonb DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, template_type)
);

-- Enable RLS on all tables
ALTER TABLE public.email_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incoming_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_servers
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

-- Create RLS policies for incoming_emails
CREATE POLICY "Incoming emails are viewable by organization members"
ON public.incoming_emails FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization members can manage incoming emails"
ON public.incoming_emails FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Create RLS policies for email_templates
CREATE POLICY "Email templates are viewable by organization members"
ON public.email_templates FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can manage email templates"
ON public.email_templates FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Add update triggers
CREATE TRIGGER update_email_servers_updated_at
BEFORE UPDATE ON public.email_servers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_email_servers_org_id ON public.email_servers(organization_id);
CREATE INDEX idx_email_servers_active ON public.email_servers(is_active);
CREATE INDEX idx_incoming_emails_org_id ON public.incoming_emails(organization_id);
CREATE INDEX idx_incoming_emails_processed ON public.incoming_emails(processed);
CREATE INDEX idx_incoming_emails_ticket_id ON public.incoming_emails(ticket_id);
CREATE INDEX idx_email_templates_org_id ON public.email_templates(organization_id);
CREATE INDEX idx_email_templates_type ON public.email_templates(template_type);