-- Mini-leagues: users create a private league (name + shareable invite
-- code), invite mates to join by code, and see a leaderboard scoped to
-- just that group. Points reuse the existing `leaderboard` view/predictions
-- data — a league is just a membership grouping, not a separate scoring
-- system.

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

alter table leagues enable row level security;
alter table league_members enable row level security;

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
