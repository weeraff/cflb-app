-- Dedup table for scheduled notifications that fire on a wall-clock
-- schedule (e.g. "12pm Sydney time") rather than per-row state on the
-- thing being notified about. standings-sync runs every 15 minutes, so
-- checking "is it currently the 12 o'clock hour in Sydney" alone would
-- fire up to 4 times; claiming a row here first (unique per type+day)
-- means only the first of those attempts actually sends.
create table if not exists daily_notifications (
  type text not null,
  sent_on date not null,
  sent_at timestamptz not null default now(),
  primary key (type, sent_on)
);

-- Service-role only (the edge function), no public policy needed —
-- RLS on by default with no policies blocks all client access.
alter table daily_notifications enable row level security;
