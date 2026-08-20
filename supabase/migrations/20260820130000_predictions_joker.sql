-- Each user can mark one fixture per round as their "Joker" for double
-- points. Enforced client-side (predictions has no round grouping of its
-- own to key a partial unique index on — round key is derived from
-- fixture kickoff dates, the same way the tiebreaker's round_key is
-- computed client-side); scoring simply doubles whatever
-- scoreOnePrediction returns when is_joker is true.
alter table predictions
  add column if not exists is_joker boolean not null default false;
