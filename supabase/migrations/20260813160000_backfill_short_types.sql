-- The two most recent YouTube uploads (S-UIzlYDbkc, qnVZGm2e8fE) were synced
-- before the Shorts-vs-episode duration check existed, so they landed as
-- type='clip' and showed up in the Podcast page's "Previous Episodes" list.
-- Both are well under the 3-minute Shorts cutoff (18s and 61s), confirmed
-- against YouTube directly on 2026-08-13. Correct them here since the sync
-- function's upsert ignores conflicts and won't fix already-stored rows.
update episodes
set type = 'short'
where source = 'youtube' and external_id in ('S-UIzlYDbkc', 'qnVZGm2e8fE');
