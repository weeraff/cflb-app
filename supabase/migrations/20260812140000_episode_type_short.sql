-- YouTube Shorts get their own type so the podcast page can separate them
-- from full-length episodes instead of lumping every YouTube upload
-- together as 'clip'.
alter table episodes drop constraint if exists episodes_type_check;
alter table episodes add constraint episodes_type_check check (type in ('episode', 'clip', 'short'));
