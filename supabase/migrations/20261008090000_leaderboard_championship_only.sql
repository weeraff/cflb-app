-- The app now runs on the Australian Championship, so the leaderboard
-- starts fresh: only Championship picks count. NPL-season predictions stay
-- in the table as history, they just no longer contribute points. Same
-- columns as before so every consumer (main board, mini-leagues, rank
-- notifications) keeps working unchanged.
create or replace view leaderboard as
  select p.user_id,
         coalesce(pr.display_name, 'Anonymous') as display_name,
         coalesce(sum(p.points_awarded), 0) as points,
         count(distinct date_trunc('week', f.kickoff_at)) as rounds_picked,
         count(*) filter (where p.points_awarded in (3, 6)) as scores,
         count(*) filter (where p.points_awarded in (1, 2)) as outcomes
  from predictions p
  join fixtures f on f.id = p.fixture_id
  left join profiles pr on pr.id = p.user_id
  where f.competition = 'Australian Championship'
  group by p.user_id, pr.display_name;
