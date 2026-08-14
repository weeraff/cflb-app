-- Phase 1 of the predictions home-screen rebuild: rank/streak stats and
-- the Beat the Host rivalry, both computed server-side in standings-sync
-- after each round's results are scored, not written directly by users.

-- Distinct from `is_reporter` (flash-reporter panel access) — a host is
-- who the "Beat the Host" widget compares a user's season points against.
-- Toggled by hand in the Supabase table editor, same pattern as
-- is_reporter and the sponsors/pundit-pick content.
alter table profiles add column if not exists is_host boolean not null default false;
update profiles set is_host = true where display_name = 'Gaz';

create table if not exists streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_updated timestamptz not null default now()
);

alter table streaks enable row level security;
create policy "users read their own streak" on streaks
  for select using (auth.uid() = user_id);

-- One row per (user, host, season) so a user's rivalry with each host can
-- be shown independently once there's more than one host. `user_points`
-- and `host_points` are each side's total scored points for that season,
-- not a per-fixture comparison — refreshed in full on every scoring run,
-- not incremented, so it can never drift out of sync with `leaderboard`.
create table if not exists beat_host_season (
  user_id uuid not null references auth.users (id) on delete cascade,
  host_id uuid not null references auth.users (id) on delete cascade,
  season_id text not null,
  user_points int not null default 0,
  host_points int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, host_id, season_id)
);

alter table beat_host_season enable row level security;
create policy "users read their own beat-host rows" on beat_host_season
  for select using (auth.uid() = user_id);

-- Tracks whether the "round results are final" push has already gone out
-- for a given round (keyed the same way the frontend keys a round: the
-- earliest kickoff date among that round's featured fixtures), so it
-- fires once per round rather than once per completed fixture.
create table if not exists round_notifications (
  round_key text primary key,
  results_notified boolean not null default false
);

alter table round_notifications enable row level security;
