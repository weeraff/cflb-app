-- Tracks each user's leaderboard position as of the last standings-sync
-- run, so a rank change can be detected (and notified on) without
-- recomputing history — just compare current rank to this stored value.
alter table profiles add column if not exists last_rank int;
