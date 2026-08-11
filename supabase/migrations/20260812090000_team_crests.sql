-- Dribl includes club logos on every ladder/result/fixture row, and we've
-- never captured them. Team names as plain text is the single biggest
-- thing making the app read as a spreadsheet rather than a real product.

alter table standings add column if not exists logo_url text;
alter table results add column if not exists home_logo text;
alter table results add column if not exists away_logo text;
alter table fixtures add column if not exists home_logo text;
alter table fixtures add column if not exists away_logo text;
