-- The `sponsors` table only had name/logo/link, enough for a static logo
-- strip. Content-driven placements (prize banner, post-submission slot)
-- need a headline, body copy, and CTA label per sponsor row.
alter table sponsors add column if not exists headline text;
alter table sponsors add column if not exists body text;
alter table sponsors add column if not exists cta_text text not null default 'Learn more';
