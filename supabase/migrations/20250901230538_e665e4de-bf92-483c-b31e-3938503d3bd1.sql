-- Drop existing cron jobs and recreate with 1 minute intervals
SELECT cron.unschedule('auto-process-emails');
SELECT cron.unschedule('auto-fetch-emails');

-- Create a cron job to automatically process emails every minute
SELECT cron.schedule(
  'auto-process-emails',
  '* * * * *', -- every minute
  $$
  SELECT
    net.http_post(
        url:='https://thzdazcmswmeolaiijml.supabase.co/functions/v1/process-pending-emails',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoemRhemNtc3dtZW9sYWlpam1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNDQzNTYsImV4cCI6MjA3MDgyMDM1Nn0.YL3OuA8zhliqJSDw8qzZjvonTXJPc9INBv-b10g_tEQ"}'::jsonb,
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Also create a cron job to fetch new emails from POP3 servers every minute
SELECT cron.schedule(
  'auto-fetch-emails',
  '* * * * *', -- every minute
  $$
  SELECT
    net.http_post(
        url:='https://thzdazcmswmeolaiijml.supabase.co/functions/v1/fetch-pop3-emails',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoemRhemNtc3dtZW9sYWlpam1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNDQzNTYsImV4cCI6MjA3MDgyMDM1Nn0.YL3OuA8zhliqJSDw8qzZjvonTXJPc9INBv-b10g_tEQ"}'::jsonb,
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);