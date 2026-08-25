-- Onboarding now collects a single "Youth" age group instead of separate
-- 18s/16s buckets (see OnboardingFlow.jsx). Widen the check constraint to
-- accept the new value; existing 18s/16s rows are remapped to youth so they
-- still pass validation.
alter table profiles
  drop constraint if exists profiles_age_group_check;

update profiles
  set age_group = 'youth'
  where age_group in ('18s', '16s');

alter table profiles
  add constraint profiles_age_group_check check (age_group in ('first_grade', '20s', 'youth'));
