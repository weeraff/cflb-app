-- No two players can share a leaderboard name. Compared ignoring case and
-- surrounding/repeated spaces, so "Gaz", "gaz" and " Gaz " all clash.
create unique index if not exists profiles_display_name_unique
  on profiles (lower(regexp_replace(btrim(display_name), '\s+', ' ', 'g')));

-- Lets the sign-up sheet warn before the account is created. Only answers
-- yes/no, so it doesn't expose anything beyond what the public leaderboard
-- already shows.
create or replace function display_name_available(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from profiles
    where lower(regexp_replace(btrim(display_name), '\s+', ' ', 'g'))
        = lower(regexp_replace(btrim(p_name), '\s+', ' ', 'g'))
      and id is distinct from auth.uid()
  )
$$;
grant execute on function display_name_available(text) to anon, authenticated;
