-- Dribl DOES expose full match events (goals with scorer/minute, cards,
-- subs, a penalties array) — just not from any endpoint tried earlier.
-- The real one, found by capturing the actual network traffic of Football
-- NSW's own match-centre page in a real browser (every plausible guess
-- against mc-api.dribl.com/api/results and /api/moments came up empty):
--   GET https://mc-api.dribl.com/api/matchcentre/{match_hash_id}?tenant={tenant_hash_id}
-- No auth required. match_hash_id is exactly fixtures.dribl_id.
--
-- `source` distinguishes automated Dribl-sourced rows from existing
-- flash-reporter ones so a sync run can safely replace only its own rows
-- without touching human-entered ones for the same fixture.
alter table match_events add column if not exists source text not null default 'reporter'
  check (source in ('reporter', 'dribl'));

create index if not exists match_events_fixture_source_idx on match_events (fixture_id, source);
