-- One-off: clears highlights_checked_at for fixtures still missing a
-- highlights match, so the next stream-sync run isn't throttled by the
-- new hourly search-fallback cooldown and can be verified immediately
-- against real data rather than waiting up to an hour.
update fixtures
set highlights_checked_at = null
where competition = 'NPL NSW'
  and status = 'completed'
  and highlights_video_id is null
  and highlights_video_id_override is null;
