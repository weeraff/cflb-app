-- The Australian Championship doesn't start until 17 Oct 2026, so as a
-- beta test we're standing in NPL NSW, League One Men's, and League Two
-- Men's, all live right now via the same api.ffa.football sibling platform
-- (api.dribl.com, confirmed live 2026-08-10). standings keeps a
-- `competition` column so this coexists with Australian Championship data
-- later rather than replacing it; group_name stays nullable since only the
-- Australian Championship's group stage needs it, the three NPL-tier
-- competitions are flat ladders.

alter table standings add column if not exists competition text not null default 'Australian Championship';
alter table standings add column if not exists group_name text;

-- Old unique(team) constraint doesn't allow the same club to appear once
-- per competition (reserves/first-grade crossover, or just future-proofing
-- against name collisions across competitions).
alter table standings drop constraint if exists standings_team_key;
alter table standings add constraint standings_competition_team_key unique (competition, team);

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

alter table results enable row level security;
create policy "results are publicly readable" on results for select using (true);
