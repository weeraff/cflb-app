-- MVP match predictor: consent capture, a database-enforced round lock,
-- join-by-link leagues and admin-only stats/export.

------------------------------------------------------------------------
-- Consent
------------------------------------------------------------------------
-- marketing_opt_in used to default to true and the old onboarding box was
-- pre-ticked, which isn't express consent. Null now means "not asked yet"
-- and triggers a one-time prompt in the app.
alter table profiles alter column marketing_opt_in drop not null;
alter table profiles alter column marketing_opt_in drop default;
alter table profiles add column if not exists consent_at timestamptz;
alter table profiles add column if not exists consent_version text;

-- Pre-ticked yeses get asked again properly. Anyone who actively unticked
-- it keeps their "no" and isn't nagged.
update profiles set marketing_opt_in = null where marketing_opt_in = true and consent_at is null;

------------------------------------------------------------------------
-- Round lock
------------------------------------------------------------------------
-- The whole round locks at its earliest featured kickoff, on time alone.
-- The old policies keyed off fixtures.status, which only changes when the
-- sync runs, so a pick could land after kickoff.
create or replace function current_round_lock()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select min(kickoff_at)
  from fixtures
  where featured and competition = 'Australian Championship'
$$;
grant execute on function current_round_lock() to anon, authenticated;

drop policy if exists "users insert their own predictions before kickoff" on predictions;
create policy "users insert their own predictions before kickoff" on predictions
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from fixtures f
      where f.id = fixture_id and f.featured and f.competition = 'Australian Championship'
    )
    and now() < current_round_lock()
  );

drop policy if exists "users update their own predictions before kickoff" on predictions;
create policy "users update their own predictions before kickoff" on predictions
  for update
  using (
    auth.uid() = user_id
    and exists (
      select 1 from fixtures f
      where f.id = fixture_id and f.featured and f.competition = 'Australian Championship'
    )
    and now() < current_round_lock()
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from fixtures f
      where f.id = fixture_id and f.featured and f.competition = 'Australian Championship'
    )
    and now() < current_round_lock()
  );

------------------------------------------------------------------------
-- Fresh Championship leaderboard
------------------------------------------------------------------------
-- Stored ranks are from the NPL season; clear them so the first scored
-- Championship round doesn't announce movement against old positions.
update profiles set last_rank = null;

------------------------------------------------------------------------
-- Admins
------------------------------------------------------------------------
-- A separate table rather than a profiles flag: users can update their own
-- profiles row, so a column there could be self-granted. No RLS policies
-- means only security definer functions (and the service role) see it.
create table if not exists admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table admins enable row level security;

insert into admins (user_id)
  select id from auth.users where email = 'garyraff88@gmail.com'
  on conflict do nothing;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admins where user_id = auth.uid())
$$;
revoke execute on function is_admin() from public, anon;
grant execute on function is_admin() to authenticated;

create or replace function admin_stats()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  return json_build_object(
    'total_signups', (select count(*) from profiles),
    'opted_in', (select count(*) from profiles where marketing_opt_in),
    'opted_out', (select count(*) from profiles where marketing_opt_in = false),
    'not_asked', (select count(*) from profiles where marketing_opt_in is null),
    'signups_by_day', coalesce((
      select json_agg(d order by d.day)
      from (
        select (created_at at time zone 'Australia/Sydney')::date as day, count(*) as signups
        from profiles
        where created_at > now() - interval '30 days'
        group by 1
      ) d
    ), '[]'::json),
    'players_by_round', coalesce((
      select json_agg(r order by r.first_kickoff)
      from (
        select f.round, min(f.kickoff_at) as first_kickoff, count(distinct p.user_id) as players
        from predictions p
        join fixtures f on f.id = p.fixture_id
        where f.competition = 'Australian Championship'
        group by f.round
      ) r
    ), '[]'::json)
  );
end;
$$;
revoke execute on function admin_stats() from public, anon;
grant execute on function admin_stats() to authenticated;

create or replace function admin_optin_export()
returns table (display_name text, email text, consent_at timestamptz, consent_version text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  return query
    select pr.display_name, u.email::text, pr.consent_at, pr.consent_version
    from profiles pr
    join auth.users u on u.id = pr.id
    where pr.marketing_opt_in
    order by pr.consent_at;
end;
$$;
revoke execute on function admin_optin_export() from public, anon;
grant execute on function admin_optin_export() to authenticated;

------------------------------------------------------------------------
-- Leagues: join by link
------------------------------------------------------------------------
-- Name and size only, so a signed-out visitor to /join/CODE can see what
-- they're joining without exposing members.
create or replace function league_preview(p_code text)
returns table (league_id uuid, league_name text, member_count int)
language sql
stable
security definer
set search_path = public
as $$
  select l.id, l.name, (select count(*)::int from league_members m where m.league_id = l.id)
  from leagues l
  where l.code = upper(trim(p_code))
$$;
grant execute on function league_preview(text) to anon, authenticated;

create or replace function join_league_by_code(p_code text)
returns table (league_id uuid, league_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  select l.id, l.name into v_id, v_name from leagues l where l.code = upper(trim(p_code));
  if v_id is null then
    raise exception 'league not found' using errcode = 'P0002';
  end if;

  insert into league_members (league_id, user_id) values (v_id, auth.uid())
    on conflict do nothing;

  return query select v_id, v_name;
end;
$$;
revoke execute on function join_league_by_code(text) from public, anon;
grant execute on function join_league_by_code(text) to authenticated;
