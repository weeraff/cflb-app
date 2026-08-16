-- Inline live-stream embeds for men's NPL NSW fixtures, matched against
-- Football NSW's YouTube channel (UCToFlwuKwvsT0g2jTS2VcOA, confirmed
-- 2026-08-17). Fields live directly on fixtures rather than a linked
-- table since it's a 1:1 relationship, same as reported_status.
alter table fixtures add column if not exists youtube_video_id text;
-- Manually pasted in the Supabase table editor when auto-match fails or
-- picks the wrong game — takes priority over the auto-matched id.
alter table fixtures add column if not exists youtube_video_id_override text;
alter table fixtures add column if not exists stream_status text not null default 'none'
  check (stream_status in ('none', 'scheduled', 'live', 'ended'));
alter table fixtures add column if not exists stream_last_checked_at timestamptz;

-- Every 10 minutes so a stream going live is picked up promptly, but the
-- function itself no-ops (zero YouTube API calls) unless a fixture is
-- actually inside its matchday window, so this doesn't burn quota on the
-- five weekdays a week nothing's kicking off.
select cron.schedule(
  'stream-sync-every-10-min',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://ylkiokeortznwmsxuusb.supabase.co/functions/v1/stream-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'
      )
    )
  );
  $$
);
