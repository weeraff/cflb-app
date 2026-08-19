-- Multiple named pundit picks per fixture (Gaz, Chaz, a guest), replacing
-- the single pundit_name/pundit_home_pick/pundit_away_pick columns on
-- fixtures which only ever supported one pundit at a time. Those columns
-- stay in place (still read by the existing "beat the pundit" teaser) —
-- this table is additive, entered by hand the same way (no admin UI yet).
create table if not exists fixture_pundits (
  fixture_id uuid not null references fixtures(id) on delete cascade,
  pundit_name text not null,
  home_pick int not null,
  away_pick int not null,
  primary key (fixture_id, pundit_name)
);

alter table fixture_pundits enable row level security;

create policy "fixture_pundits are publicly readable" on fixture_pundits for select using (true);
