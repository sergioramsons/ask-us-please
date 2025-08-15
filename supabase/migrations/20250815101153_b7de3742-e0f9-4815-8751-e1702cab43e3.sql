-- Create email server configurations table
CREATE TABLE public.email_servers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_username TEXT NOT NULL,
  smtp_password TEXT NOT NULL,
  use_tls BOOLEAN NOT NULL DEFAULT true,
  sender_name TEXT NOT NULL DEFAULT 'Support Team',
  sender_email TEXT NOT NULL,
  reply_to TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.email_servers ENABLE ROW LEVEL SECURITY;

-- Create policies for email servers (admin only)
CREATE POLICY "Only admins can view email servers" 
ON public.email_servers 
FOR SELECT 
USING (public.current_user_has_role('admin'));

CREATE POLICY "Only admins can create email servers" 
ON public.email_servers 
FOR INSERT 
WITH CHECK (public.current_user_has_role('admin'));

CREATE POLICY "Only admins can update email servers" 
ON public.email_servers 
FOR UPDATE 
USING (public.current_user_has_role('admin'));

CREATE POLICY "Only admins can delete email servers" 
ON public.email_servers 
FOR DELETE 
USING (public.current_user_has_role('admin'));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_email_servers_updated_at
BEFORE UPDATE ON public.email_servers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();