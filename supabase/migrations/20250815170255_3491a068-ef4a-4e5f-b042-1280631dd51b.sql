-- Check for all triggers on email_servers table
SELECT tgname, tgrelid::regclass
FROM pg_trigger 
WHERE tgrelid = 'public.email_servers'::regclass;