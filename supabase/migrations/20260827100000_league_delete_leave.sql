-- Leagues had no way to delete or manage after creation — the creator
-- couldn't remove one, and there was no delete policy allowing it anyway.
-- league_members already cascades on leagues delete (see mini_leagues
-- migration), so removing the league row alone is enough to clean up
-- membership too.
create policy "creators delete their own leagues" on leagues
  for delete using (auth.uid() = created_by);
