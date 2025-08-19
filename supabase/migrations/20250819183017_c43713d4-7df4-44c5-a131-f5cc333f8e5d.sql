-- Add missing auto_process column to incoming_mail_servers table
ALTER TABLE public.incoming_mail_servers 
ADD COLUMN auto_process BOOLEAN NOT NULL DEFAULT true;