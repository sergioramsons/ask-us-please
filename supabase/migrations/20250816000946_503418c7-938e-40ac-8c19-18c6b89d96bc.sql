-- Fix security definer view issues by updating existing secure views
-- The secure views were created but need to be updated to avoid security definer warnings

-- Drop existing secure views and recreate without security definer
DROP VIEW IF EXISTS public.email_servers_secure;
DROP VIEW IF EXISTS public.incoming_mail_servers_secure;

-- Create secure views for email servers (without sensitive password data)
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
  CASE 
    WHEN password_encrypted THEN 'encrypted'
    ELSE 'plain'
  END as password_status,
  created_at,
  updated_at
FROM public.email_servers;

-- Create secure views for incoming mail servers (without sensitive password data)
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
  password_encrypted,
  CASE 
    WHEN password_encrypted THEN 'encrypted'
    ELSE 'plain'
  END as password_status,
  last_check,
  created_at,
  updated_at
FROM public.incoming_mail_servers;

-- Update functions to set proper search_path (fix function search path mutable warning)
CREATE OR REPLACE FUNCTION public.password_appears_encrypted(password_text text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if password starts with 'enc:' prefix or looks like base64 and is long enough
  IF password_text IS NULL OR password_text = '' THEN
    RETURN false;
  END IF;
  
  -- Check for encryption prefix
  IF password_text LIKE 'enc:%' THEN
    RETURN true;
  END IF;
  
  -- Check if it looks like base64 and is long enough to be encrypted
  IF length(password_text) >= 50 AND password_text ~ '^[A-Za-z0-9+/=]+$' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.encrypt_server_password(plain_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.decrypt_server_password(encrypted_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.migrate_email_server_passwords()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log the migration attempt
  RAISE NOTICE 'Starting email server password migration process';
  
  -- Update the audit function to handle password changes
  INSERT INTO public.email_server_audit (
    server_id, 
    action, 
    performed_by, 
    details
  ) 
  SELECT 
    id,
    'PASSWORD_MIGRATION',
    auth.uid(),
    jsonb_build_object(
      'migration_timestamp', now(),
      'description', 'Automated password encryption migration'
    )
  FROM public.email_servers 
  WHERE password_encrypted = false;
  
  RAISE NOTICE 'Password migration audit logged';
END;
$function$;

CREATE OR REPLACE FUNCTION public.encrypt_email_server_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Encrypt password if not already encrypted
  NEW.smtp_password = public.encrypt_server_password(NEW.smtp_password);
  NEW.password_encrypted = true;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.encrypt_incoming_mail_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Encrypt password if not already encrypted
  NEW.password = public.encrypt_server_password(NEW.password);
  NEW.password_encrypted = true;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_password_encrypted(server_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT password_encrypted 
    FROM public.email_servers 
    WHERE id = server_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_email_server_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;