-- Create table for storing incoming emails
CREATE TABLE public.incoming_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT UNIQUE NOT NULL,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_text TEXT,
  body_html TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed BOOLEAN NOT NULL DEFAULT false,
  ticket_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for email attachments
CREATE TABLE public.email_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES public.incoming_emails(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for support tickets (if not exists)
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  created_by UUID,
  assigned_to UUID,
  department_id UUID,
  contact_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  first_response_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for ticket comments/responses
CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  email_id UUID REFERENCES public.incoming_emails(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incoming_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for incoming_emails
CREATE POLICY "Admins can view all incoming emails" 
ON public.incoming_emails 
FOR SELECT 
USING (current_user_has_role('admin'::app_role));

CREATE POLICY "System can insert incoming emails" 
ON public.incoming_emails 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can update incoming emails" 
ON public.incoming_emails 
FOR UPDATE 
USING (current_user_has_role('admin'::app_role));

-- RLS Policies for email_attachments
CREATE POLICY "Admins can view all email attachments" 
ON public.email_attachments 
FOR SELECT 
USING (current_user_has_role('admin'::app_role));

CREATE POLICY "System can insert email attachments" 
ON public.email_attachments 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for tickets
CREATE POLICY "Admins can view all tickets" 
ON public.tickets 
FOR SELECT 
USING (current_user_has_role('admin'::app_role));

CREATE POLICY "Users can view assigned tickets" 
ON public.tickets 
FOR SELECT 
USING (auth.uid() = assigned_to OR auth.uid() = created_by);

CREATE POLICY "Authenticated users can create tickets" 
ON public.tickets 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update tickets" 
ON public.tickets 
FOR UPDATE 
USING (current_user_has_role('admin'::app_role));

CREATE POLICY "Assigned users can update their tickets" 
ON public.tickets 
FOR UPDATE 
USING (auth.uid() = assigned_to);

-- RLS Policies for ticket_comments
CREATE POLICY "Admins can view all ticket comments" 
ON public.ticket_comments 
FOR SELECT 
USING (current_user_has_role('admin'::app_role));

CREATE POLICY "Users can view comments on their tickets" 
ON public.ticket_comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t 
    WHERE t.id = ticket_id 
    AND (t.assigned_to = auth.uid() OR t.created_by = auth.uid())
  )
);

CREATE POLICY "Authenticated users can create comments" 
ON public.ticket_comments 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own comments" 
ON public.ticket_comments 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Create indexes for performance
CREATE INDEX idx_incoming_emails_sender ON public.incoming_emails(sender_email);
CREATE INDEX idx_incoming_emails_processed ON public.incoming_emails(processed);
CREATE INDEX idx_incoming_emails_received_at ON public.incoming_emails(received_at);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX idx_ticket_comments_ticket_id ON public.ticket_comments(ticket_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_incoming_emails_updated_at
  BEFORE UPDATE ON public.incoming_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ticket_comments_updated_at
  BEFORE UPDATE ON public.ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate ticket numbers
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  ticket_number TEXT;
BEGIN
  -- Get the next ticket number (simple incremental)
  SELECT COALESCE(MAX(CAST(SPLIT_PART(ticket_number, '-', 2) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.tickets
  WHERE ticket_number ~ '^TKT-[0-9]+$';
  
  -- Format as TKT-000001
  ticket_number := 'TKT-' || LPAD(next_number::TEXT, 6, '0');
  
  RETURN ticket_number;
END;
$$ LANGUAGE plpgsql;