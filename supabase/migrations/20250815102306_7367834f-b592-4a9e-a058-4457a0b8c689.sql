-- Add encryption key column and update existing passwords to be encrypted
-- First, let's add a column to track if passwords are encrypted
ALTER TABLE public.email_servers 
ADD COLUMN password_encrypted BOOLEAN NOT NULL DEFAULT false;

-- Add a comment to the password column to indicate it will store encrypted data
COMMENT ON COLUMN public.email_servers.smtp_password IS 'Encrypted SMTP password - never store in plain text';

-- Create a function to safely handle password encryption status
CREATE OR REPLACE FUNCTION public.is_password_encrypted(server_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT password_encrypted 
    FROM public.email_servers 
    WHERE id = server_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;