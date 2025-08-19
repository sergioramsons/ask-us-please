-- Add missing auto_create_tickets column to incoming_mail_servers table
ALTER TABLE public.incoming_mail_servers 
ADD COLUMN auto_create_tickets BOOLEAN NOT NULL DEFAULT true;