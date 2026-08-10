-- standings-sync now also locks fixtures at kickoff and scores predictions
-- once a result lands. Every 6 hours means a fixture could stay open for
-- picks hours after it's actually kicked off, and predictions could sit
-- unscored for hours after full time, both undercut the whole point of
-- predictions (a fast pick -> wait -> result -> rank loop). Every 15 min
-- matches news-sync's cadence.

select cron.unschedule('standings-sync-every-6-hours');

select cron.schedule(
  'standings-sync-every-15-min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://ylkiokeortznwmsxuusb.supabase.co/functions/v1/standings-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'
      )
    )
  );
  $$
);
