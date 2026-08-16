-- Highlights matching (Part 2 of the watch/highlights/match-detail brief).
-- Same pattern as the live-stream fields added for stream-sync: an
-- auto-matched id, a manual override that always wins, and a checked-at
-- timestamp so the sync function can stop re-searching once a match is
-- old enough that a highlights upload was never going to land.
alter table fixtures add column if not exists highlights_video_id text;
alter table fixtures add column if not exists highlights_video_id_override text;
alter table fixtures add column if not exists highlights_checked_at timestamptz;

-- Flash reporters can now log a missed penalty alongside goals and cards,
-- for the match-detail dropdown (Part 3). Dribl has no event-level data
-- to source this from automatically — see commit message for what was
-- actually checked before landing on this.
alter table match_events drop constraint if exists match_events_type_check;
alter table match_events add constraint match_events_type_check
  check (type in ('goal', 'card', 'missed_penalty'));
