-- Add missing password_status column to incoming_mail_servers table
ALTER TABLE public.incoming_mail_servers 
ADD COLUMN IF NOT EXISTS password_status text;