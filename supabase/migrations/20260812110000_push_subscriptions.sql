-- Web Push subscriptions. Each browser/device a user opts in on gets its
-- own row (endpoint is unique per browser install), so one user can have
-- several if they enable notifications on both phone and desktop.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "users manage their own push subscriptions" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Sending is service-role only (from the edge function), no public
-- select policy needed beyond what the owning user needs above.
