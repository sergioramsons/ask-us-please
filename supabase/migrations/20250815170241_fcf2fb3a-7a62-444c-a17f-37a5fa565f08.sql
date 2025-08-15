-- Temporarily disable the audit trigger and delete all email settings
DROP TRIGGER IF EXISTS audit_email_server_changes ON public.email_servers;
DELETE FROM public.email_server_audit;
DELETE FROM public.email_servers;