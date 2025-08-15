-- Enhanced security fix for email server credentials
-- Set search_path to prevent function search path issues
SET search_path = public, extensions;

-- Update the security function with proper search path
CREATE OR REPLACE FUNCTION public.is_password_encrypted(server_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT password_encrypted 
    FROM public.email_servers 
    WHERE id = server_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Add additional security constraints
ALTER TABLE public.email_servers 
ADD CONSTRAINT check_password_not_empty CHECK (smtp_password IS NOT NULL AND length(smtp_password) > 0);

-- Add audit logging for password access
CREATE TABLE IF NOT EXISTS public.email_server_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID REFERENCES public.email_servers(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET,
  details JSONB
);

-- Enable RLS on audit table
ALTER TABLE public.email_server_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view email server audit logs" 
ON public.email_server_audit 
FOR SELECT 
USING (public.current_user_has_role('admin'));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" 
ON public.email_server_audit 
FOR INSERT 
WITH CHECK (true);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_email_server_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.email_server_audit (
    server_id, 
    action, 
    performed_by, 
    details
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Add audit trigger
DROP TRIGGER IF EXISTS email_server_audit_trigger ON public.email_servers;
CREATE TRIGGER email_server_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.email_servers
  FOR EACH ROW EXECUTE FUNCTION public.audit_email_server_access();

-- Add security comment
COMMENT ON TABLE public.email_servers IS 'Email server configurations - all passwords must be encrypted using AES-256-GCM';
COMMENT ON COLUMN public.email_servers.password_encrypted IS 'Boolean flag indicating if smtp_password is encrypted - must be true for production use';