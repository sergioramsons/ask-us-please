-- Create function to decrypt server passwords
CREATE OR REPLACE FUNCTION public.decrypt_server_password(encrypted_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;