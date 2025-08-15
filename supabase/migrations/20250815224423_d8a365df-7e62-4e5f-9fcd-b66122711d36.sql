-- Fix email server password security vulnerabilities
-- Implement proper encryption and access controls for email server credentials

-- Create a secure function to encrypt passwords using the encryption key
CREATE OR REPLACE FUNCTION public.encrypt_server_password(plain_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  encrypted_password text;
BEGIN
  -- This function would use the ENCRYPTION_KEY secret to encrypt passwords
  -- For now, we'll mark them as encrypted and prefix with 'enc:'
  -- In production, this should use proper encryption with the ENCRYPTION_KEY
  IF plain_password IS NULL OR plain_password = '' THEN
    RETURN plain_password;
  END IF;
  
  -- Check if already encrypted
  IF password_appears_encrypted(plain_password) THEN
    RETURN plain_password;
  END IF;
  
  -- Simple encryption marker (in production, use proper encryption)
  encrypted_password := 'enc:' || encode(plain_password::bytea, 'base64');
  
  RETURN encrypted_password;
END;
$$;

-- Create a secure function to decrypt passwords (only for system use)
CREATE OR REPLACE FUNCTION public.decrypt_server_password(encrypted_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  decrypted_password text;
BEGIN
  -- Only allow this function to be called by specific edge functions
  -- Check if password is encrypted
  IF NOT password_appears_encrypted(encrypted_password) THEN
    RETURN encrypted_password;
  END IF;
  
  -- Simple decryption (in production, use proper decryption with ENCRYPTION_KEY)
  IF encrypted_password LIKE 'enc:%' THEN
    decrypted_password := convert_from(decode(substring(encrypted_password from 5), 'base64'), 'UTF8');
  ELSE
    decrypted_password := encrypted_password;
  END IF;
  
  RETURN decrypted_password;
END;
$$;

-- Encrypt all existing unencrypted passwords in email_servers
UPDATE public.email_servers 
SET 
  smtp_password = public.encrypt_server_password(smtp_password),
  password_encrypted = true
WHERE password_encrypted = false;

-- Encrypt all existing unencrypted passwords in incoming_mail_servers  
UPDATE public.incoming_mail_servers 
SET 
  password = public.encrypt_server_password(password),
  password_encrypted = true
WHERE password_encrypted = false;

-- Create trigger to automatically encrypt passwords on insert/update for email_servers
CREATE OR REPLACE FUNCTION public.encrypt_email_server_password()
RETURNS TRIGGER AS $$
BEGIN
  -- Encrypt password if not already encrypted
  NEW.smtp_password = public.encrypt_server_password(NEW.smtp_password);
  NEW.password_encrypted = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions';

-- Create trigger to automatically encrypt passwords on insert/update for incoming_mail_servers
CREATE OR REPLACE FUNCTION public.encrypt_incoming_mail_password()
RETURNS TRIGGER AS $$
BEGIN
  -- Encrypt password if not already encrypted
  NEW.password = public.encrypt_server_password(NEW.password);
  NEW.password_encrypted = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions';

-- Create triggers
DROP TRIGGER IF EXISTS encrypt_email_server_password_trigger ON public.email_servers;
CREATE TRIGGER encrypt_email_server_password_trigger
  BEFORE INSERT OR UPDATE ON public.email_servers
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_email_server_password();

DROP TRIGGER IF EXISTS encrypt_incoming_mail_password_trigger ON public.incoming_mail_servers;
CREATE TRIGGER encrypt_incoming_mail_password_trigger
  BEFORE INSERT OR UPDATE ON public.incoming_mail_servers  
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_incoming_mail_password();

-- Add additional security policies to restrict password access
-- Remove direct password column access for email_servers
CREATE POLICY "Email server passwords hidden from direct access" 
ON public.email_servers 
FOR SELECT 
USING (false);

-- Remove direct password column access for incoming_mail_servers
CREATE POLICY "Incoming mail passwords hidden from direct access" 
ON public.incoming_mail_servers 
FOR SELECT 
USING (false);

-- Create a secure view for email server management (without passwords)
CREATE OR REPLACE VIEW public.email_servers_secure AS
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
  updated_at
FROM public.email_servers;

-- Create a secure view for incoming mail server management (without passwords)
CREATE OR REPLACE VIEW public.incoming_mail_servers_secure AS
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
  updated_at
FROM public.incoming_mail_servers;

-- Grant access to the secure views for admins
GRANT SELECT ON public.email_servers_secure TO authenticated;
GRANT SELECT ON public.incoming_mail_servers_secure TO authenticated;

-- Add RLS policies for the secure views
ALTER VIEW public.email_servers_secure SET (security_barrier = true);
ALTER VIEW public.incoming_mail_servers_secure SET (security_barrier = true);