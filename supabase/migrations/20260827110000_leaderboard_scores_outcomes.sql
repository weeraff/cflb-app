-- Football-table-style leaderboard needs Scores (exact scoreline hits)
-- and Outcomes (correct result, wrong score) as separate tiebreaker
-- columns, not just total points. points_awarded already encodes which
-- is which without a separate flag: 3 or 6 (joker doubles it) means an
-- exact score, 1 or 2 means a correct outcome only, 0 means wrong.
create or replace view leaderboard as
  select p.user_id,
         coalesce(pr.display_name, 'Anonymous') as display_name,
         coalesce(sum(p.points_awarded), 0) as points,
         count(distinct date_trunc('week', f.kickoff_at)) as rounds_picked,
         count(*) filter (where p.points_awarded in (3, 6)) as scores,
         count(*) filter (where p.points_awarded in (1, 2)) as outcomes
  from predictions p
  left join profiles pr on pr.id = p.user_id
  left join fixtures f on f.id = p.fixture_id
  group by p.user_id, pr.display_name;
