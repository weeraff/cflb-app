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
  type text not null check (type in ('episode', 'clip')),
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
  ground text,
  kickoff_at timestamptz not null,
  home_score int,
  away_score int,
  status text not null default 'scheduled' check (status in ('scheduled', 'locked', 'completed')),
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
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
    )
  );

create policy "users update their own predictions before kickoff" on predictions
  for update using (
    auth.uid() = user_id
    and exists (
      select 1 from fixtures
      where fixtures.id = fixture_id
      and fixtures.status = 'scheduled'
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

-- ingestion_errors is operational data, no public policy, service role only.
