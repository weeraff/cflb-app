-- Wires predictions up to real fixtures from the same Dribl source as
-- standings/results, across NPL NSW, League One, and League Two.

alter table fixtures add column if not exists competition text not null default 'Australian Championship';
alter table fixtures add column if not exists dribl_id text unique;
alter table fixtures add column if not exists round text;
alter table fixtures add column if not exists ground text;

-- results.dribl_id was keyed on the result resource's own hash_id, which
-- differs from the fixture resource's hash_id for the same real match.
-- Dribl exposes a stable match_hash_id on both that's the real join key
-- fixtures <-> results need for locking/scoring predictions. Clearing and
-- letting the next sync repopulate is simplest, this table has no
-- user-generated data, it's a pure mirror of the Dribl API.
truncate table results;
