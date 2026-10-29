-- Email pick reminders: an hourly job (email-reminders function) emails
-- opted-in players who haven't locked in the current round, about 24 hours
-- before lock and again on the morning of lock day.

-- One row per reminder actually sent, so nobody gets the same one twice
-- even though the job runs every hour. No policies: only the service role
-- (the function) touches it.
create table if not exists email_reminders_sent (
  round text not null,
  kind text not null check (kind in ('day-before', 'lock-day')),
  user_id uuid not null references auth.users (id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (round, kind, user_id)
);
alter table email_reminders_sent enable row level security;

-- Opted-in players with fewer picks than the round has games, who haven't
-- had this reminder yet. Includes their email (from auth.users), so it's
-- callable by the service role only.
create or replace function reminder_recipients(p_round text, p_kind text)
returns table (user_id uuid, email text, display_name text, points int, rank int)
language sql
stable
security definer
set search_path = public
as $$
  with featured as (
    select id from fixtures where featured and competition = 'Australian Championship'
  ),
  ranked as (
    select l.user_id, l.points,
           row_number() over (order by l.points desc, l.scores desc, l.outcomes desc) as rank
    from leaderboard l
  )
  select p.id, u.email::text, p.display_name, coalesce(r.points, 0)::int, r.rank::int
  from profiles p
  join auth.users u on u.id = p.id
  left join ranked r on r.user_id = p.id
  where p.marketing_opt_in
    and u.email is not null
    and (select count(*) from predictions pr where pr.user_id = p.id and pr.fixture_id in (select id from featured))
        < (select count(*) from featured)
    and not exists (
      select 1 from email_reminders_sent s
      where s.round = p_round and s.kind = p_kind and s.user_id = p.id
    )
  order by p.display_name
$$;
revoke execute on function reminder_recipients(text, text) from public, anon, authenticated;
grant execute on function reminder_recipients(text, text) to service_role;

-- Hourly, 5 past. The function itself decides whether it's inside a send
-- window, so most runs exit immediately. Same vault-key auth as the sync
-- jobs (see 20260810090247_use_vault_for_cron_auth.sql).
select cron.schedule(
  'email-reminders-hourly',
  '5 * * * *',
  $$
  select net.http_post(
    url := 'https://ylkiokeortznwmsxuusb.supabase.co/functions/v1/email-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'
      )
    )
  );
  $$
);
