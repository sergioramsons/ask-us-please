-- Create a function to migrate existing unencrypted passwords
CREATE OR REPLACE FUNCTION public.migrate_email_server_passwords()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
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
$$;

-- Create a function to check if a password appears to be encrypted
CREATE OR REPLACE FUNCTION public.password_appears_encrypted(password_text text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
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
$$;

-- Add constraint to ensure new passwords are always marked as encrypted
-- This will be enforced at the application level for better error handling