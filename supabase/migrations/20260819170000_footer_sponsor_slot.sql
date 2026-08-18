-- SponsorShowcase (the "Our Sponsors" strip in the footer, every page)
-- was reading a static array from placeholderData.js and never touched
-- the real sponsors table at all — the only sponsor placement in the app
-- that wasn't actually live. Adding a 'footer' slot so it can be.
alter table sponsors drop constraint if exists sponsors_slot_check;
alter table sponsors add constraint sponsors_slot_check
  check (slot in ('header', 'feed', 'sidebar', 'predictions_top', 'predictions_post_submit', 'footer'));

-- Seeds the footer with the same three sponsors (real, confirmed assets/
-- links) the static array showed, so the footer doesn't go empty the
-- moment it switches to live data. Two of these already exist in other
-- slots (predictions_top, predictions_post_submit) — footer is a fourth,
-- independent placement for the same real partners, not a duplicate.
insert into sponsors (name, logo_url, link_url, slot, headline, cta_text, active)
values
  (
    'Premiership Experience',
    '/sponsors/premiership-experience.jpg',
    'https://www.premiershipexperience.co.uk/contact/#form',
    'footer',
    'Award Winning Bespoke Football Tours',
    'Get a Free Quote',
    true
  ),
  (
    'Football Fitness AU',
    '/sponsors/football-fitness.webp',
    'https://www.footballfitness.com.au/builtforgameday',
    'footer',
    'Prepare for Pre-Season',
    'Get Game Day Ready',
    true
  ),
  (
    'Souvlaki Boys',
    '/sponsors/souvlaki-boys.jpg',
    'https://souvlakiboys.com.au/',
    'footer',
    'Love Souvlaki? Try the Champagne Pack, $89',
    'Order Now',
    true
  )
on conflict do nothing;
