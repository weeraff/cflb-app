-- Four fixtures had highlights_video_id pointing at full match replays
-- (~2h15m each) instead of the actual highlights reel — confirmed by
-- checking each video directly: titled "NPL Men's NSW - Team A v Team B"
-- (no "Highlights"), not "NPL Men's NSW Round N Highlights - Team A v
-- Team B". stream-sync's matcher now requires "Highlights" in the title
-- (see the isHighlightsVideo filter added alongside this migration), so
-- resetting these lets the next run re-match them correctly.
update fixtures
set highlights_video_id = null, highlights_checked_at = null
where highlights_video_id in ('Sq3dNyDBddQ', 'XOiNDpghkno', 'iBg6FypjHZ0', 'sYditsV8arM');
