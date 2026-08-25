-- "Rounds picked" lets people see that a high score often just means more
-- picks made, not necessarily a better hit rate. Rounds aren't a modelled
-- entity (see theEight.js) — The Eight is a weekly bundle of fixtures
-- spanning up to 3 competitions with their own independent round numbers,
-- so counting distinct fixtures.round would overcount. Calendar week of
-- kickoff is the closest stand-in for "a round" without adding a table.
create or replace view leaderboard as
  select p.user_id,
         coalesce(pr.display_name, 'Anonymous') as display_name,
         coalesce(sum(p.points_awarded), 0) as points,
         count(distinct date_trunc('week', f.kickoff_at)) as rounds_picked
  from predictions p
  left join profiles pr on pr.id = p.user_id
  left join fixtures f on f.id = p.fixture_id
  group by p.user_id, pr.display_name;
