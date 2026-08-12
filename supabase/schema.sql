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
  -- Each week the show features 12 fixtures for predictions (4 per
  -- competition), hand-picked, not every fixture that syncs in.
  featured boolean not null default false,
  -- Whether a "picks closing soon" / "full time" push has already gone
  -- out for this fixture, so the cron doesn't re-send it every run.
  notified_picks_closing boolean not null default false,
  notified_result boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  -- Leaderboard position as of the last standings-sync run, so a rank
  -- change can be detected and notified on without recomputing history.
  last_rank int,
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
  slot text not null check (slot in ('header', 'feed', 'sidebar')),
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

-- Leaderboard is a public read of aggregated points; expose via a view
-- rather than opening predictions to public select.
create or replace view leaderboard as
  select p.user_id, coalesce(pr.display_name, 'Anonymous') as display_name,
         coalesce(sum(p.points_awarded), 0) as points
  from predictions p
  left join profiles pr on pr.id = p.user_id
  group by p.user_id, pr.display_name;

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

-- ingestion_errors is operational data, no public policy, service role only.
