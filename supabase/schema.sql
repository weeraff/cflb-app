-- Champagne Football Lemonade Banter beta app.
-- Full schema reference, kept in sync with supabase/migrations/.
-- For a fresh project, running this file directly is enough.
-- For an already-live project, use `supabase db push` against the
-- migrations folder instead, that's the actual source of truth.

create extension if not exists "pgcrypto";

-- ============ News aggregator ============

create table if not exists news_items (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  title text not null,
  url text not null unique,
  snippet text,
  image_url text,
  published_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists news_items_published_at_idx on news_items (published_at desc);

create table if not exists ingestion_errors (
  id uuid primary key default gen_random_uuid(),
  job text not null, -- 'news' | 'podcast' | 'standings'
  source text,
  message text not null,
  occurred_at timestamptz not null default now()
);

-- ============ Podcast hub ============

create table if not exists episodes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null check (type in ('episode', 'clip', 'short')),
  source text not null check (source in ('spotify', 'youtube')),
  embed_url text not null,
  external_id text not null,
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (source, external_id)
);

create index if not exists episodes_published_at_idx on episodes (published_at desc);

-- ============ League tables ============
--
-- `competition` scopes each row (NPL, League One, League Two, and later
-- Australian Championship once its 2026 season starts). `group_name` is
-- only used by competitions with a group stage; NPL-tier ladders are flat
-- so it stays null there.

create table if not exists standings (
  id uuid primary key default gen_random_uuid(),
  competition text not null default 'Australian Championship',
  group_name text,
  position int not null,
  team text not null,
  logo_url text,
  played int not null default 0,
  won int not null default 0,
  drawn int not null default 0,
  lost int not null default 0,
  gf int not null default 0,
  ga int not null default 0,
  gd int not null default 0,
  points int not null default 0,
  updated_at timestamptz not null default now(),
  unique (competition, team)
);

create table if not exists results (
  id uuid primary key default gen_random_uuid(),
  competition text not null,
  dribl_id text not null unique,
  round text,
  home_team text not null,
  away_team text not null,
  home_logo text,
  away_logo text,
  home_score int,
  away_score int,
  played_at timestamptz not null,
  ground text,
  created_at timestamptz not null default now()
);

create index if not exists results_played_at_idx on results (played_at desc);

-- Sourced from Dribl's "moments" leaderboards. Only Goals, Red Cards, and
-- Yellow Cards are tracked there, no assists data exists, so goals only.
create table if not exists top_scorers (
  id uuid primary key default gen_random_uuid(),
  competition text not null,
  dribl_id text not null,
  player_name text not null,
  club_name text not null,
  goals int not null default 0,
  image_url text,
  updated_at timestamptz not null default now(),
  unique (competition, dribl_id)
);

-- ============ Predictions ============

create table if not exists fixtures (
  id uuid primary key default gen_random_uuid(),
  competition text not null default 'Australian Championship',
  dribl_id text unique,
  round text,
  home_team text not null,
  away_team text not null,
  home_logo text,
  away_logo text,
  ground text,
  kickoff_at timestamptz not null,
  home_score int,
  away_score int,
  status text not null default 'scheduled' check (status in ('scheduled', 'locked', 'completed')),
  -- Each week the show features 8 fixtures for predictions ("The Eight":
  -- 4 NPL NSW, 3 League One, 1 League Two), hand-picked, not every
  -- fixture that syncs in.
  featured boolean not null default false,
  -- Whether a "picks closing soon" / "full time" push has already gone
  -- out for this fixture, so the cron doesn't re-send it every run.
  notified_picks_closing boolean not null default false,
  notified_result boolean not null default false,
  -- Flash-reporter UI state (live/full_time), entirely separate from
  -- `status`/`home_score`/`away_score` above, which stay governed by the
  -- official Dribl-driven standings-sync pipeline.
  reported_status text not null default 'scheduled' check (reported_status in ('scheduled', 'live', 'full_time')),
  -- Optional featured pundit pick ("Gaz picked 2-1"), manually entered
  -- alongside the weekly featured-fixture curation. Null when unset.
  pundit_name text,
  pundit_home_pick int,
  pundit_away_pick int,
  -- Inline live-stream embed, matched against Football NSW's YouTube
  -- channel by stream-sync. youtube_video_id_override is pasted by hand
  -- in the table editor when auto-match fails or picks the wrong game,
  -- and takes priority over the auto-matched youtube_video_id.
  youtube_video_id text,
  youtube_video_id_override text,
  stream_status text not null default 'none' check (stream_status in ('none', 'scheduled', 'live', 'ended')),
  stream_last_checked_at timestamptz,
  -- Highlights: same auto-match + manual-override pattern as the live
  -- stream fields above.
  highlights_video_id text,
  highlights_video_id_override text,
  highlights_checked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  -- Leaderboard position as of the last standings-sync run, so a rank
  -- change can be detected and notified on without recomputing history.
  last_rank int,
  -- Allowlisted flash reporters (toggled by hand in the Supabase
  -- dashboard, no admin UI in v1) can log live goal/card events.
  is_reporter boolean not null default false,
  -- Distinct from is_reporter — who the "Beat the Host" widget compares a
  -- user's season points against. Toggled by hand, same pattern.
  is_host boolean not null default false,
  -- Powers the personalised Home dashboard (next fixture, watch/
  -- highlights). Free text, not a foreign key — team names aren't a
  -- dedicated table anywhere in this schema.
  followed_team text,
  created_at timestamptz not null default now()
);

create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  fixture_id uuid not null references fixtures (id) on delete cascade,
  home_score_pick int not null,
  away_score_pick int not null,
  points_awarded int,
  created_at timestamptz not null default now(),
  unique (user_id, fixture_id)
);

-- Golden-goal-style tiebreaker: one extra prediction per round (minute of
-- the first goal across the round). Rounds aren't modelled as their own
-- entity, so `round_key` is a stable, client-derived label (the earliest
-- kickoff date among that round's 8 fixtures) rather than a foreign key.
create table if not exists tiebreaker_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  round_key text not null,
  minute_pick int not null check (minute_pick >= 0 and minute_pick <= 120),
  created_at timestamptz not null default now(),
  unique (user_id, round_key)
);

-- Server-computed (standings-sync, after scoring) — never written to
-- directly by users.
create table if not exists streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_updated timestamptz not null default now()
);

-- One row per (user, host, season); user_points/host_points are each
-- side's total scored season points, refreshed in full on every scoring
-- run rather than incremented, so it can't drift out of sync with
-- `leaderboard`.
create table if not exists beat_host_season (
  user_id uuid not null references auth.users (id) on delete cascade,
  host_id uuid not null references auth.users (id) on delete cascade,
  season_id text not null,
  user_points int not null default 0,
  host_points int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, host_id, season_id)
);

-- Tracks whether the "round results are final" push has gone out for a
-- round (keyed the same way the frontend keys one: the earliest kickoff
-- date among that round's featured fixtures), so it fires once per round.
create table if not exists round_notifications (
  round_key text primary key,
  results_notified boolean not null default false
);

-- ============ Flash reporter ============

-- Trusted users (profiles.is_reporter) log goal/card events and lineups
-- for a fixture in real time. This is a distinct layer from the official
-- Dribl-driven fixtures.status/home_score/away_score pipeline in
-- standings-sync; nothing here can conflict with the automated scoring
-- and predictions pipeline that already depends on `status`.
create table if not exists match_events (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references fixtures(id) on delete cascade,
  type text not null check (type in ('goal', 'card', 'missed_penalty')),
  minute int not null check (minute >= 0),
  team text not null check (team in ('home', 'away')),
  player_name text not null,
  -- goals only
  assist_name text,
  -- cards only
  card_type text check (card_type in ('yellow', 'red')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  -- Distinguishes automated Dribl-sourced rows (mc-api.dribl.com/api/
  -- matchcentre/{match_hash_id}) from human-entered flash-reporter ones,
  -- so a Dribl sync can safely replace only its own rows for a fixture.
  source text not null default 'reporter' check (source in ('reporter', 'dribl'))
);

create index if not exists match_events_fixture_id_idx on match_events (fixture_id);
create index if not exists match_events_fixture_source_idx on match_events (fixture_id, source);

create table if not exists match_lineups (
  fixture_id uuid not null references fixtures(id) on delete cascade,
  team text not null check (team in ('home', 'away')),
  -- Simple free-text fallback (one player per line), not a structured
  -- roster — typing a real lineup fast pre-kickoff is the priority.
  starting_xi text,
  subs text,
  updated_at timestamptz not null default now(),
  primary key (fixture_id, team)
);

-- ============ Mini-leagues ============

-- Users create a private league (name + shareable invite code), invite
-- mates to join by code, and see a leaderboard scoped to just that group.
-- Points reuse the existing `leaderboard` view/predictions data — a league
-- is just a membership grouping, not a separate scoring system.
create table if not exists leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists league_members (
  league_id uuid not null references leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

create index if not exists league_members_user_id_idx on league_members (user_id);

-- ============ Sponsor slots ============

create table if not exists sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  link_url text not null,
  slot text not null check (slot in ('header', 'feed', 'sidebar', 'predictions_top', 'predictions_post_submit', 'footer')),
  headline text,
  body text,
  cta_text text not null default 'Learn more',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Web Push subscriptions. Each browser/device a user opts in on gets its
-- own row (endpoint is unique per browser install), so one user can have
-- several if they enable notifications on both phone and desktop.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

-- ============ Row Level Security ============

alter table news_items enable row level security;
alter table episodes enable row level security;
alter table standings enable row level security;
alter table results enable row level security;
alter table top_scorers enable row level security;
alter table fixtures enable row level security;
alter table sponsors enable row level security;
alter table profiles enable row level security;
alter table predictions enable row level security;
alter table ingestion_errors enable row level security;
alter table push_subscriptions enable row level security;
alter table leagues enable row level security;
alter table league_members enable row level security;
alter table match_events enable row level security;
alter table match_lineups enable row level security;
alter table tiebreaker_predictions enable row level security;
alter table streaks enable row level security;
alter table beat_host_season enable row level security;
alter table round_notifications enable row level security;

-- Public read-only content: anyone (including anon) can read, only the
-- service role (used by scheduled edge functions) can write.
create policy "news_items are publicly readable" on news_items for select using (true);
create policy "episodes are publicly readable" on episodes for select using (true);
create policy "standings are publicly readable" on standings for select using (true);
create policy "results are publicly readable" on results for select using (true);
create policy "top_scorers are publicly readable" on top_scorers for select using (true);
create policy "fixtures are publicly readable" on fixtures for select using (true);
create policy "active sponsors are publicly readable" on sponsors for select using (active);

-- Profiles: readable by anyone (needed for leaderboard display names),
-- writable only by the owning user.
create policy "profiles are publicly readable" on profiles for select using (true);
create policy "users manage their own profile" on profiles
  for insert with check (auth.uid() = id);
create policy "users update their own profile" on profiles
  for update using (auth.uid() = id);

-- Predictions: users can only see and manage their own picks, and only
-- before the fixture locks at kickoff.
create policy "users read their own predictions" on predictions
  for select using (auth.uid() = user_id);

create policy "users insert their own predictions before kickoff" on predictions
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from fixtures
      where fixtures.id = fixture_id
      and fixtures.status = 'scheduled'
      and fixtures.featured = true
    )
  );

create policy "users update their own predictions before kickoff" on predictions
  for update using (
    auth.uid() = user_id
    and exists (
      select 1 from fixtures
      where fixtures.id = fixture_id
      and fixtures.status = 'scheduled'
      and fixtures.featured = true
    )
  );

create policy "users read their own tiebreaker picks" on tiebreaker_predictions
  for select using (auth.uid() = user_id);

create policy "users manage their own tiebreaker picks" on tiebreaker_predictions
  for insert with check (auth.uid() = user_id);

create policy "users update their own tiebreaker picks" on tiebreaker_predictions
  for update using (auth.uid() = user_id);

-- Streaks and beat_host_season are server-computed (standings-sync, using
-- the service role which bypasses RLS) — users can read their own row but
-- there's no insert/update policy for the authenticated role.
create policy "users read their own streak" on streaks
  for select using (auth.uid() = user_id);

create policy "users read their own beat-host rows" on beat_host_season
  for select using (auth.uid() = user_id);

-- Leaderboard is a public read of aggregated points; expose via a view
-- rather than opening predictions to public select.
create or replace view leaderboard as
  select p.user_id, coalesce(pr.display_name, 'Anonymous') as display_name,
         coalesce(sum(p.points_awarded), 0) as points
  from predictions p
  left join profiles pr on pr.id = p.user_id
  group by p.user_id, pr.display_name;

-- Powers the "X% picked the same result" stat on a submitted Champagne
-- Nine pick; same aggregated-view pattern as `leaderboard` above.
create or replace view fixture_result_stats as
  select
    fixture_id,
    case
      when home_score_pick > away_score_pick then 'home'
      when home_score_pick < away_score_pick then 'away'
      else 'draw'
    end as predicted_result,
    count(*) as pick_count
  from predictions
  group by fixture_id, predicted_result;

create policy "users manage their own push subscriptions" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Any signed-in user can look up a league by code to join it; the code
-- itself is the shared secret, not row-level access.
create policy "leagues are readable by authenticated users" on leagues
  for select using (auth.role() = 'authenticated');

create policy "authenticated users create leagues" on leagues
  for insert with check (auth.uid() = created_by);

-- Members can see who else is in a league they're also in (needed to
-- build the scoped leaderboard); no visibility into leagues they're not in.
create policy "members are readable by other members" on league_members
  for select using (
    exists (
      select 1 from league_members lm
      where lm.league_id = league_members.league_id
        and lm.user_id = auth.uid()
    )
  );

create policy "users join leagues themselves" on league_members
  for insert with check (auth.uid() = user_id);

create policy "users leave leagues themselves" on league_members
  for delete using (auth.uid() = user_id);

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
-- and status changes push to open tabs without a refresh.
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

-- ingestion_errors is operational data, no public policy, service role only.
