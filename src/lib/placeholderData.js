// Sample data shown until the app is wired up to Supabase + real feeds.
// Shapes here match the tables in supabase/schema.sql.
//
// The news items below are a real snapshot pulled live from the confirmed
// sources on 2026-08-03 (see supabase/functions/news-sync) — not invented
// examples — so this preview shows what the aggregator actually produces.
// They'll go stale over time; once news-sync is deployed this list is
// replaced entirely by the live Supabase query in NewsPage.jsx.

export const placeholderNews = [
  {
    id: 'n1',
    source: "NPL Men's NSW",
    title: 'Round 26 Review – NPL Men’s NSW',
    url: 'https://mens.nplnsw.com.au/2026/08/02/round-26-review-npl-mens-nsw-3/',
    snippet: 'A look back at all the action from Round 26 of the National Premier Leagues NSW competition, including Awan Lual reaching a major milestone for Western Sydney Wanderers FC.',
    image_url: 'https://mens.nplnsw.com.au/wp-content/uploads/sites/37/2026/07/npl-mens-nsw-match-of-the-round-Review-4.jpg',
    published_at: '2026-08-02T09:25:22Z',
  },
  {
    id: 'n2',
    source: "NPL Men's NSW",
    title: 'Konestabo Hat-Trick Sends APIA Five Points Clear At The Summit',
    url: 'https://mens.nplnsw.com.au/2026/08/02/konestabo-hat-trick-sends-apia-five-points-clear-at-the-summit/',
    snippet: 'APIA Leichhardt FC strengthen their grip on the 2026 Premiership race after Michael Konestabo’s hat-trick inspired a 3-1 win over Sydney Olympic.',
    image_url: 'https://mens.nplnsw.com.au/wp-content/uploads/sites/37/2026/08/Article-Image-2-1.jpg',
    published_at: '2026-08-02T09:06:43Z',
  },
  {
    id: 'n3',
    source: "NPL Men's NSW",
    title: 'Nakano Stunner Leads United 58 To Dominant Victory Over Spirit',
    url: 'https://mens.nplnsw.com.au/2026/08/02/nakano-stunner-leads-united-58-to-dominant-victory-over-spirit/',
    snippet: 'Sydney United 58 continue their strong run of form with a 2-0 win over NWS Spirit FC, keeping them within touching distance of second spot.',
    image_url: 'https://mens.nplnsw.com.au/wp-content/uploads/sites/37/2026/08/Article-Image-7.jpg',
    published_at: '2026-08-02T08:58:28Z',
  },
  {
    id: 'n4',
    source: 'HIGHPRESS',
    title: "Preston Lions condemn 'abhorrent' behaviour as NPL giants respond to Football Victoria sanctions",
    url: 'https://highpressau.com/posts/preston-lions-response-football-victoria-sanctions-npl-vic',
    snippet: 'Australian state league football, told properly.',
    image_url: 'https://cdn.sanity.io/images/d38l1cj2/production/86ee62d8a2da967fa1389546da6b75e62a38f5fc-992x558.jpg?rect=0,19,992,521&w=1200&h=630',
    published_at: '2026-07-24T21:13:13Z',
  },
  {
    id: 'n5',
    source: 'HIGHPRESS',
    title: "Max Court is off to the A-League. He's the latest proof of APIA's remarkable production line",
    url: 'https://highpressau.com/posts/max-court-brisbane-roar-signing-apia-leichhardt-npl-nsw-a-league-transfer-news',
    snippet: 'Australian state league football, told properly.',
    image_url: 'https://cdn.sanity.io/images/d38l1cj2/production/b7462830e8d6b69ecbd3807f4185e4a225ab5a1a-852x884.jpg?rect=0,84,852,447&w=1200&h=630',
    published_at: '2026-07-23T02:02:08Z',
  },
]

// The 5 most recent real episodes pulled live from the show's RSS feed
// (anchor.fm/s/10ab793e0) on 2026-08-07 — not invented examples. The RSS
// guid isn't a public Spotify episode id, so these play via the real audio
// enclosure instead of a Spotify iframe; podcast-sync will keep this list
// current automatically once deployed.
export const placeholderEpisodes = [
  {
    id: 'e1',
    title: 'RD 26 Review: Marconi Lose...Again, Tigers & Parramatta Win, Life at Bankstown City',
    description: 'NPL NSW Round 26 review — Marconi’s losing streak continues, wins for Tigers and Parramatta, plus life at Bankstown City.',
    type: 'episode',
    source: 'spotify',
    embed_url:
      'https://anchor.fm/s/10ab793e0/podcast/play/123727995/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2026-7-4%2F429163889-44100-2-cce28bf7a54fb.mp3',
    published_at: '2026-08-04T02:28:58Z',
  },
  {
    id: 'e2',
    title: 'RD 25: Bankstown Derby Drama, Marconi & Utd Slip Up & the Business End Run in Discussion',
    description: 'NPL NSW Round 25 review — Bankstown derby drama, Marconi and United both slip up, plus the business end run-in.',
    type: 'episode',
    source: 'spotify',
    embed_url:
      'https://anchor.fm/s/10ab793e0/podcast/play/123412953/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2026-6-28%2F428740807-44100-2-2fbcda3ccf833.mp3',
    published_at: '2026-07-28T04:26:04Z',
  },
  {
    id: 'e3',
    title: 'RD 24 Review: Title Race Heats Up, Will St George Survive? Mounties Promoted',
    description: 'NPL NSW Round 24 review — the title race heats up, can St George survive the drop, and Mounties are promoted.',
    type: 'episode',
    source: 'spotify',
    embed_url:
      'https://anchor.fm/s/10ab793e0/podcast/play/123094898/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2026-6-20%2F428311708-44100-2-dc50cd545a5f.mp3',
    published_at: '2026-07-20T23:58:18Z',
  },
  {
    id: 'e4',
    title: 'RD 23: Marconi Clean Sheet, Can Olympic Survive? Berries Run Continues',
    description: 'NPL NSW Round 23 review — Marconi keep a clean sheet, can Olympic survive, and the Berries’ run continues.',
    type: 'episode',
    source: 'spotify',
    embed_url:
      'https://anchor.fm/s/10ab793e0/podcast/play/122805320/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2026-6-14%2F427918335-44100-2-f2acf9589d52a.mp3',
    published_at: '2026-07-14T04:10:02Z',
  },
  {
    id: 'e5',
    title: "RD 22: Sydney Utd Win ANOTHER Waratah, Marconi's Defence, The Bankstown Side No-One Expected",
    description: 'NPL NSW Round 22 review — Sydney United win another Waratah Cup tie, Marconi’s defence under the microscope, and the Bankstown side nobody expected.',
    type: 'episode',
    source: 'spotify',
    embed_url:
      'https://anchor.fm/s/10ab793e0/podcast/play/122482040/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2026-6-7%2F427484916-44100-2-d0a8192cfe5da.mp3',
    published_at: '2026-07-07T00:55:10Z',
  },
  {
    id: 'e6',
    title: 'Latest uploads',
    description: 'The most recent videos and clips from the channel.',
    type: 'clip',
    source: 'youtube',
    embed_url: 'https://www.youtube.com/embed/videoseries?list=UUbfWQYNp7XBsreEFSukTWlQ',
    published_at: '2026-06-30T01:32:56Z',
  },
]

export const placeholderStandings = [
  { position: 1, team: 'Sydney FC Youth', played: 18, won: 14, drawn: 2, lost: 2, gf: 41, ga: 15, gd: 26, points: 44 },
  { position: 2, team: 'Melbourne Victory NPL', played: 18, won: 12, drawn: 4, lost: 2, gf: 38, ga: 18, gd: 20, points: 40 },
  { position: 3, team: 'Perth Glory Reserves', played: 18, won: 11, drawn: 3, lost: 4, gf: 33, ga: 20, gd: 13, points: 36 },
  { position: 4, team: 'Adelaide City', played: 18, won: 10, drawn: 4, lost: 4, gf: 30, ga: 22, gd: 8, points: 34 },
]

export const placeholderFixtures = [
  { id: 'f1', home_team: 'Sydney FC Youth', away_team: 'Melbourne Victory NPL', kickoff_at: '2026-10-04T05:00:00Z', status: 'scheduled' },
  { id: 'f2', home_team: 'Perth Glory Reserves', away_team: 'Adelaide City', kickoff_at: '2026-10-04T09:00:00Z', status: 'scheduled' },
]

export const placeholderLeaderboard = [
  { display_name: 'gazaff', points: 24 },
  { display_name: 'banter_king', points: 21 },
  { display_name: 'championship_tragic', points: 19 },
]

// Real sponsors confirmed by Gaz, 2026-08-07, shown together in one
// dedicated section rather than scattered inline slots. Images are real
// photos pulled from each sponsor's own site, not stock/invented.
export const sponsors = [
  {
    id: 's1',
    name: 'Premiership Experience',
    headline: 'Award Winning Bespoke Football Tours',
    cta: 'Get a Free Quote',
    image: '/sponsors/premiership-experience.jpg',
    link_url: 'https://www.premiershipexperience.co.uk/contact/#form',
  },
  {
    id: 's2',
    name: 'Football Fitness AU',
    headline: 'Prepare for Pre-Season',
    cta: 'Get Game Day Ready',
    image: '/sponsors/football-fitness.webp',
    link_url: 'https://www.footballfitness.com.au/builtforgameday',
  },
  {
    id: 's3',
    name: 'Souvlaki Boys',
    headline: 'Love Souvlaki? Try the Champagne Pack — $89',
    cta: 'Order Now',
    image: '/sponsors/souvlaki-boys.jpg',
    link_url: 'https://souvlakiboys.com.au/',
  },
]
