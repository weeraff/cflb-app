-- Powers the personalised Home dashboard (your team's next fixture,
-- watch/highlights for their games). Free text rather than a foreign key
-- since team names aren't a dedicated table anywhere in this schema —
-- standings/results/fixtures all just store the team name directly.
alter table profiles add column if not exists followed_team text;
