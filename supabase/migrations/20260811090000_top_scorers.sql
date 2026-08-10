-- Top goal scorers, sourced from Dribl's "moments" leaderboards (same
-- platform as standings/results). Checked all three competitions on
-- 2026-08-11: only Goals, Red Cards, and Yellow Cards are tracked there,
-- no assists data exists for any of them, so this is goals only.

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

alter table top_scorers enable row level security;
create policy "top_scorers are publicly readable" on top_scorers for select using (true);
