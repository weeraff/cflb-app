-- Onboarding fields captured at first sign-in: role, league, team (reuses
-- existing followed_team), age group, and marketing consent. All nullable
-- except marketing_opt_in — a row with role = null means the user hasn't
-- completed onboarding yet (see OnboardingGate in the app).
alter table profiles
  add column if not exists role text check (role in ('player', 'coach', 'fan')),
  add column if not exists league text,
  add column if not exists age_group text check (age_group in ('first_grade', '20s', '18s', '16s')),
  add column if not exists marketing_opt_in boolean not null default true;
