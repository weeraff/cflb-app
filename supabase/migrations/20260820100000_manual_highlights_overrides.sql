-- Three fixtures' real highlights videos exist but weren't auto-matched
-- because Football NSW abbreviates the club name in the title for some
-- clubs ("Western Sydney Wanderers" -> "WSW", "Marconi Stallions" ->
-- "Marconi", "APIA Leichhardt" -> "APIA") — a known limitation, not
-- fixed generally since guessing abbreviations risks matching the wrong
-- club entirely. Confirmed correct by hand (title, both team names,
-- right round) via the stream-sync diagnostic output; using the manual
-- override field that exists exactly for this case.
update fixtures set highlights_video_id_override = 'diAdunB5zQA'
where home_team = 'Western Sydney Wanderers FC' and away_team = 'St George FC';

update fixtures set highlights_video_id_override = 'zOtaVqQiOhs'
where home_team = 'APIA Leichhardt FC' and away_team = 'SD Raiders FC';

update fixtures set highlights_video_id_override = 'neswkchHV6o'
where home_team = 'Marconi Stallions FC' and away_team = 'Sutherland Sharks FC';
