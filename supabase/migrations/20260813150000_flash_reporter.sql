-- Flash reporter system: trusted users (allowlisted via profiles.is_reporter,
-- toggled by hand in the Supabase dashboard for now, no admin UI in v1) can
-- log goal/card events and lineups for a fixture in real time. This is a
-- distinct layer from the official Dribl-driven status/home_score/away_score
-- pipeline in standings-sync — reported_status is purely the flash-reporter
-- UI state, so nothing here can conflict with or corrupt the automated
-- scoring/predictions pipeline that already depends on `status`.

alter table profiles add column if not exists is_reporter boolean not null default false;

alter table fixtures add column if not exists reported_status text not null default 'scheduled'
  check (reported_status in ('scheduled', 'live', 'full_time'));

create table if not exists match_events (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references fixtures(id) on delete cascade,
  type text not null check (type in ('goal', 'card')),
  minute int not null check (minute >= 0),
  team text not null check (team in ('home', 'away')),
  player_name text not null,
  -- goals only
  assist_name text,
  -- cards only
  card_type text check (card_type in ('yellow', 'red')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists match_events_fixture_id_idx on match_events (fixture_id);

create table if not exists match_lineups (
  fixture_id uuid not null references fixtures(id) on delete cascade,
  team text not null check (team in ('home', 'away')),
  -- Simple free-text fallback (one player per line) rather than a
  -- structured roster — typing a real lineup fast pre-kickoff is the
  -- priority, not clean data entry.
  starting_xi text,
  subs text,
  updated_at timestamptz not null default now(),
  primary key (fixture_id, team)
);

alter table match_events enable row level security;
alter table match_lineups enable row level security;

-- Live events and lineups are public read (that's the whole point of the
-- public-facing live view); writes are restricted to allowlisted reporters.
create policy "match_events are publicly readable" on match_events for select using (true);
create policy "match_lineups are publicly readable" on match_lineups for select using (true);

create policy "reporters manage match_events" on match_events for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_reporter))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_reporter));

create policy "reporters manage match_lineups" on match_lineups for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_reporter))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_reporter));

-- Reporters also need to flip fixtures.reported_status (live / full_time).
-- Trust-based, not column-scoped: an allowlisted reporter can update any
-- fixture, consistent with the brief's small-trusted-allowlist model.
create policy "reporters update fixtures" on fixtures for update
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_reporter));

-- Realtime: the public live view subscribes to these so goal/card events
-- and status changes push to open tabs without a refresh. Guarded checks
-- since a table already added via the dashboard's realtime toggle would
-- otherwise fail this migration outright.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'match_events'
  ) then
    alter publication supabase_realtime add table match_events;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'fixtures'
  ) then
    alter publication supabase_realtime add table fixtures;
  end if;
end $$;
