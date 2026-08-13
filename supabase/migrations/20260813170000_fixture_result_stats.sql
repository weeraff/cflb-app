-- Powers the "X% picked the same result" stat shown once a user has
-- submitted their Champagne Nine picks. Aggregated counts only, same
-- pattern as the existing `leaderboard` view, so it doesn't need to (and
-- shouldn't) touch the RLS policy restricting row-level `predictions`
-- access to each user's own rows.
create or replace view fixture_result_stats as
  select
    fixture_id,
    case
      when home_score_pick > away_score_pick then 'home'
      when home_score_pick < away_score_pick then 'away'
      else 'draw'
    end as predicted_result,
    count(*) as pick_count
  from predictions
  group by fixture_id, predicted_result;
