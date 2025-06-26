
-- Enable required extensions for cron functionality
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to save automatic snapshots
CREATE OR REPLACE FUNCTION public.save_auto_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function will be called by the edge function
  -- We'll create the actual snapshot logic in the edge function
  -- This is just a placeholder for potential future database-level operations
  RAISE NOTICE 'Auto snapshot trigger executed at %', now();
END;
$$;

-- Schedule the cron job to run every day at 11:00 PM (23:00)
SELECT cron.schedule(
  'daily-auto-snapshot',
  '0 23 * * *', -- Every day at 11:00 PM
  $$
  SELECT
    net.http_post(
        url:='https://rkykyafrphsrvrzncovu.supabase.co/functions/v1/auto-snapshot',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJreWt5YWZycGhzcnZyem5jb3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0NTU4MDgsImV4cCI6MjA2NjAzMTgwOH0.7HcEbDmSlkQ3SOgxOTpIGrxAIK3Z6bwKK2Gwtqddtck"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);
