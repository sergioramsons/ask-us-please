-- Drop the audit trigger before deleting data
DROP TRIGGER IF EXISTS email_server_audit_trigger ON public.email_servers;

-- Delete all audit records first (to avoid foreign key constraints)
DELETE FROM public.email_server_audit;

-- Delete all email servers
DELETE FROM public.email_servers;