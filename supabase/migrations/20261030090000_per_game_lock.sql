-- Each game now locks at its own kickoff instead of the whole round
-- locking at the first one. A pick is accepted for a featured
-- Championship game until that game kicks off, on time alone.

drop policy if exists "users insert their own predictions before kickoff" on predictions;
create policy "users insert their own predictions before kickoff" on predictions
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from fixtures f
      where f.id = fixture_id
        and f.featured
        and f.competition = 'Australian Championship'
        and now() < f.kickoff_at
    )
  );

drop policy if exists "users update their own predictions before kickoff" on predictions;
create policy "users update their own predictions before kickoff" on predictions
  for update
  using (
    auth.uid() = user_id
    and exists (
      select 1 from fixtures f
      where f.id = fixture_id
        and f.featured
        and f.competition = 'Australian Championship'
        and now() < f.kickoff_at
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from fixtures f
      where f.id = fixture_id
        and f.featured
        and f.competition = 'Australian Championship'
        and now() < f.kickoff_at
    )
  );

-- Reminders: someone needs a nudge if any game that hasn't kicked off yet
-- is missing a pick.
create or replace function reminder_recipients(p_round text, p_kind text)
returns table (user_id uuid, email text, display_name text, points int, rank int)
language sql
stable
security definer
set search_path = public
as $$
  with upcoming as (
    select id from fixtures
    where featured and competition = 'Australian Championship' and kickoff_at > now()
  ),
  ranked as (
    select l.user_id, l.points,
           row_number() over (order by l.points desc, l.scores desc, l.outcomes desc) as rank
    from leaderboard l
  )
  select p.id, u.email::text, p.display_name, coalesce(r.points, 0)::int, r.rank::int
  from profiles p
  join auth.users u on u.id = p.id
  left join ranked r on r.user_id = p.id
  where p.marketing_opt_in
    and u.email is not null
    and (select count(*) from upcoming) > 0
    and (select count(*) from predictions pr where pr.user_id = p.id and pr.fixture_id in (select id from upcoming))
        < (select count(*) from upcoming)
    and not exists (
      select 1 from email_reminders_sent s
      where s.round = p_round and s.kind = p_kind and s.user_id = p.id
    )
  order by p.display_name
$$;
revoke execute on function reminder_recipients(text, text) from public, anon, authenticated;
grant execute on function reminder_recipients(text, text) to service_role;
