-- Seeds the two new predictions sponsor slots with the sponsors we have
-- real, confirmed assets/links for (Premiership Experience, Football
-- Fitness AU — see placeholderData.js sponsors). Goalkeeper Society is
-- named in the brief as a future sponsor but has no confirmed logo/link
-- yet, so it's deliberately left out here rather than fabricated.
insert into sponsors (name, logo_url, link_url, slot, headline, body, cta_text, active)
values
  (
    'Premiership Experience',
    '/sponsors/premiership-experience.jpg',
    'https://www.premiershipexperience.co.uk/contact/#form',
    'predictions_top',
    'This round''s prize: a taste of matchday like the pros see it',
    'Top the leaderboard this month and Premiership Experience is in the prize pool — award-winning bespoke football tours.',
    'See the prize',
    true
  ),
  (
    'Football Fitness AU',
    '/sponsors/football-fitness.webp',
    'https://www.footballfitness.com.au/builtforgameday',
    'predictions_post_submit',
    'Picks locked in. Now get your legs ready for matchday.',
    'Football Fitness AU''s pre-season conditioning programs are built for players stepping up a level this year.',
    'Get game day ready',
    true
  )
on conflict do nothing;
