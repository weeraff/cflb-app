-- Each week the show features 12 fixtures for predictions (4 per
-- competition), hand-picked by Gaz, not every fixture Dribl syncs in.
-- New fixtures land unfeatured by default; featuring them is a manual
-- step via the Supabase table editor for now (toggle `featured` to true
-- on the 12 chosen rows in the `fixtures` table).

alter table fixtures add column if not exists featured boolean not null default false;

-- Defense in depth: even if someone crafts a direct API call, picks can
-- only be made against fixtures actually featured that week.
drop policy if exists "users insert their own predictions before kickoff" on predictions;
create policy "users insert their own predictions before kickoff" on predictions
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from fixtures
      where fixtures.id = fixture_id
      and fixtures.status = 'scheduled'
      and fixtures.featured = true
    )
  );

drop policy if exists "users update their own predictions before kickoff" on predictions;
create policy "users update their own predictions before kickoff" on predictions
  for update using (
    auth.uid() = user_id
    and exists (
      select 1 from fixtures
      where fixtures.id = fixture_id
      and fixtures.status = 'scheduled'
      and fixtures.featured = true
    )
  );
