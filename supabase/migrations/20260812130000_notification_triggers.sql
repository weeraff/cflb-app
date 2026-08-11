-- Tracks whether a "picks closing soon" / "full time" push has already
-- gone out for a fixture, so the 15-minute cron doesn't re-send the same
-- notification every run while a fixture sits in the trigger window.
alter table fixtures add column if not exists notified_picks_closing boolean not null default false;
alter table fixtures add column if not exists notified_result boolean not null default false;
