-- Add missing check_interval column to incoming_mail_servers table
ALTER TABLE public.incoming_mail_servers 
ADD COLUMN check_interval INTEGER NOT NULL DEFAULT 5;