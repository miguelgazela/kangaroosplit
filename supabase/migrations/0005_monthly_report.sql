-- Monthly email report: on the 1st of each month, a pg_cron job calls the
-- `kangaroosplit-monthly-report` edge function, which emails every member a
-- summary of the month that just ended.
--
-- Apply: Supabase dashboard -> SQL Editor -> paste -> Run.
-- Replace CHANGE_ME with the value of KANGAROOSPLIT_WEBHOOK_SECRET in the
-- editor, not in this file: it must not end up in git.
--
-- pg_cron and pg_net are project-wide extensions. Enabling them does not touch
-- the other app's data, and the job below only calls this app's function.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Safe to run again: replaces the job if it already exists.
select cron.unschedule('kangaroosplit-monthly-report')
where exists (select 1 from cron.job where jobname = 'kangaroosplit-monthly-report');

-- 08:00 UTC on the 1st = 08:00 or 09:00 in Lisbon, depending on summer time.
select cron.schedule(
  'kangaroosplit-monthly-report',
  '0 8 1 * *',
  $job$
  select net.http_post(
    url := 'https://varnswkomuckwgobplld.supabase.co/functions/v1/kangaroosplit-monthly-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', 'CHANGE_ME'
    ),
    body := '{}'::jsonb
  );
  $job$
);
