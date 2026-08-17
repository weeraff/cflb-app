update fixtures
set highlights_checked_at = null
where competition = 'NPL NSW'
  and status = 'completed'
  and highlights_video_id is null
  and highlights_video_id_override is null;
