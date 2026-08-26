-- "members are readable by other members" checked membership by querying
-- league_members from inside its own USING clause on league_members —
-- Postgres correctly detects that as infinite recursion and refuses to
-- run it ("infinite recursion detected in policy for relation
-- league_members"). A SECURITY DEFINER helper function runs with the
-- privileges of its owner, bypassing RLS on the query inside it, which
-- breaks the loop.
create or replace function is_league_member(target_league_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from league_members
    where league_id = target_league_id and user_id = auth.uid()
  );
$$;

drop policy if exists "members are readable by other members" on league_members;

create policy "members are readable by other members" on league_members
  for select using (is_league_member(league_id));
