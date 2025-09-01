-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to fetch emails from POP3 servers every 5 minutes
SELECT cron.schedule(
  'fetch-pop3-emails-job',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://thzdazcmswmeolaiijml.supabase.co/functions/v1/fetch-pop3-emails',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoemRhemNtc3dtZW9sYWlpam1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNDQzNTYsImV4cCI6MjA3MDgyMDM1Nn0.YL3OuA8zhliqJSDw8qzZjvonTXJPc9INBv-b10g_tEQ"}'::jsonb,
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Create cron job to process pending emails every 2 minutes
SELECT cron.schedule(
  'process-pending-emails-job',
  '*/2 * * * *', -- Every 2 minutes
  $$
  SELECT
    net.http_post(
        url:='https://thzdazcmswmeolaiijml.supabase.co/functions/v1/process-pending-emails',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoemRhemNtc3dtZW9sYWlpam1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNDQzNTYsImV4cCI6MjA3MDgyMDM1Nn0.YL3OuA8zhliqJSDw8qzZjvonTXJPc9INBv-b10g_tEQ"}'::jsonb,
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);