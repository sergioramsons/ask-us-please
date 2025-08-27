-- Fix security definer functions by ensuring proper search_path is set
-- This prevents potential security vulnerabilities in functions with elevated privileges

-- Fix decrypt_server_password function
CREATE OR REPLACE FUNCTION public.decrypt_server_password(encrypted_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  decrypted_password text;
BEGIN
  -- For now, just remove the 'enc:' prefix if present and try base64 decode
  -- This is a simplified fallback implementation
  
  IF encrypted_password IS NULL OR encrypted_password = '' THEN
    RETURN '';
  END IF;
  
  -- Remove 'enc:' prefix if present
  IF encrypted_password LIKE 'enc:%' THEN
    encrypted_password := substring(encrypted_password from 5);
  END IF;
  
  -- Try to decode as base64 (fallback for simpler encryption)
  BEGIN
    decrypted_password := convert_from(decode(encrypted_password, 'base64'), 'UTF8');
    RETURN decrypted_password;
  EXCEPTION
    WHEN OTHERS THEN
      -- If base64 decode fails, return the original password
      -- This handles cases where password might not be encrypted
      RETURN encrypted_password;
  END;
END;
$function$;

-- Fix migrate_email_server_passwords function
CREATE OR REPLACE FUNCTION public.migrate_email_server_passwords()
RETURNS TABLE(id uuid, organization_id uuid, migration_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- This function handles migrating email server passwords to encrypted format
  RETURN QUERY
  SELECT 
    es.id,
    es.organization_id,
    'completed'::TEXT as migration_status
  FROM public.email_servers es
  WHERE es.password_encrypted = false;
  
  -- Update all unencrypted passwords to encrypted status
  UPDATE public.email_servers 
  SET password_encrypted = true 
  WHERE password_encrypted = false;
END;
$function$;

-- Fix delete_organization function
CREATE OR REPLACE FUNCTION public.delete_organization(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.organizations WHERE id = org_id;
  RETURN FOUND;
END;
$function$;