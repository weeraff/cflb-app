-- Supports "The Eight": the 8-fixture (4 NPL NSW / 3 League One / 1 League
-- Two) redesign of the prediction flow, replacing the 9-fixture Champagne
-- Nine format. Fixture selection stays a manual curation step via the
-- existing `featured` flag - this migration only adds the extra fields
-- that curation step now also fills in.

-- Optional per-fixture featured pundit pick ("Gaz picked 2-1"), manually
-- entered alongside the weekly featured-fixture curation. Null when no
-- pundit pick has been set for that fixture.
alter table fixtures add column if not exists pundit_name text;
alter table fixtures add column if not exists pundit_home_pick int;
alter table fixtures add column if not exists pundit_away_pick int;

-- Golden-goal-style tiebreaker: one extra prediction per round (minute of
-- the first goal across the round), used only to break ties on points.
-- Rounds aren't modelled as their own entity, so `round_key` is a stable,
-- client-derived label (the earliest kickoff date among that round's 8
-- fixtures) rather than a foreign key.
create table if not exists tiebreaker_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  round_key text not null,
  minute_pick int not null check (minute_pick >= 0 and minute_pick <= 120),
  created_at timestamptz not null default now(),
  unique (user_id, round_key)
);

alter table tiebreaker_predictions enable row level security;

create policy "users read their own tiebreaker picks" on tiebreaker_predictions
  for select using (auth.uid() = user_id);

create policy "users manage their own tiebreaker picks" on tiebreaker_predictions
  for insert with check (auth.uid() = user_id);

create policy "users update their own tiebreaker picks" on tiebreaker_predictions
  for update using (auth.uid() = user_id);

-- Two new sponsor slots: one for the prize-framing banner at the top of
-- the prediction flow, one for the contextual sponsor slot shown right
-- after a round is submitted.
alter table sponsors drop constraint if exists sponsors_slot_check;
alter table sponsors add constraint sponsors_slot_check
  check (slot in ('header', 'feed', 'sidebar', 'predictions_top', 'predictions_post_submit'));
