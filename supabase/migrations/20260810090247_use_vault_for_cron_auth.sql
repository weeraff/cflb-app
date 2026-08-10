-- Schedules news-sync (and podcast-sync, standings-sync) to run
-- automatically via pg_cron + pg_net, calling the deployed edge functions.
--
-- The service role key these jobs authenticate with is stored in
-- Supabase Vault (named 'service_role_key'), set separately and directly
-- against the remote database, and deliberately never written to a
-- migration file (this repo is public):
--   select vault.create_secret('<key>', 'service_role_key', 'Cron auth for sync functions');

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'news-sync-every-20-min',
  '*/20 * * * *',
  $$
  select net.http_post(
    url := 'https://ylkiokeortznwmsxuusb.supabase.co/functions/v1/news-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'
      )
    )
  );
  $$
);

select cron.schedule(
  'podcast-sync-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://ylkiokeortznwmsxuusb.supabase.co/functions/v1/podcast-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'
      )
    )
  );
  $$
);

select cron.schedule(
  'standings-sync-every-6-hours',
  '0 */6 * * *',
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
