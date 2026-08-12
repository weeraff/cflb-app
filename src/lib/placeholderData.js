// Sample data shown until the app is wired up to Supabase + real feeds.
// Shapes here match the tables in supabase/schema.sql.
//
// The news items below are a real snapshot pulled live from the confirmed
// sources on 2026-08-03 (see supabase/functions/news-sync), not invented
// examples, so this preview shows what the aggregator actually produces.
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
// (anchor.fm/s/10ab793e0) on 2026-08-07, not invented examples. The RSS
// guid isn't a public Spotify episode id, so these play via the real audio
// enclosure instead of a Spotify iframe; podcast-sync will keep this list
// current automatically once deployed.
export const placeholderEpisodes = [
  {
    id: 'e1',
    title: 'RD 26 Review: Marconi Lose...Again, Tigers & Parramatta Win, Life at Bankstown City',
    description: 'NPL NSW Round 26 review: Marconi’s losing streak continues, wins for Tigers and Parramatta, plus life at Bankstown City.',
    type: 'episode',
    source: 'spotify',
    embed_url:
      'https://anchor.fm/s/10ab793e0/podcast/play/123727995/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2026-7-4%2F429163889-44100-2-cce28bf7a54fb.mp3',
    published_at: '2026-08-04T02:28:58Z',
  },
  {
    id: 'e2',
    title: 'RD 25: Bankstown Derby Drama, Marconi & Utd Slip Up & the Business End Run in Discussion',
    description: 'NPL NSW Round 25 review: Bankstown derby drama, Marconi and United both slip up, plus the business end run-in.',
    type: 'episode',
    source: 'spotify',
    embed_url:
      'https://anchor.fm/s/10ab793e0/podcast/play/123412953/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2026-6-28%2F428740807-44100-2-2fbcda3ccf833.mp3',
    published_at: '2026-07-28T04:26:04Z',
  },
  {
    id: 'e3',
    title: 'RD 24 Review: Title Race Heats Up, Will St George Survive? Mounties Promoted',
    description: 'NPL NSW Round 24 review: the title race heats up, can St George survive the drop, and Mounties are promoted.',
    type: 'episode',
    source: 'spotify',
    embed_url:
      'https://anchor.fm/s/10ab793e0/podcast/play/123094898/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2026-6-20%2F428311708-44100-2-dc50cd545a5f.mp3',
    published_at: '2026-07-20T23:58:18Z',
  },
  {
    id: 'e4',
    title: 'RD 23: Marconi Clean Sheet, Can Olympic Survive? Berries Run Continues',
    description: 'NPL NSW Round 23 review: Marconi keep a clean sheet, can Olympic survive, and the Berries’ run continues.',
    type: 'episode',
    source: 'spotify',
    embed_url:
      'https://anchor.fm/s/10ab793e0/podcast/play/122805320/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2026-6-14%2F427918335-44100-2-f2acf9589d52a.mp3',
    published_at: '2026-07-14T04:10:02Z',
  },
  {
    id: 'e5',
    title: "RD 22: Sydney Utd Win ANOTHER Waratah, Marconi's Defence, The Bankstown Side No-One Expected",
    description: 'NPL NSW Round 22 review: Sydney United win another Waratah Cup tie, Marconi’s defence under the microscope, and the Bankstown side nobody expected.',
    type: 'episode',
    source: 'spotify',
    embed_url:
      'https://anchor.fm/s/10ab793e0/podcast/play/122482040/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2026-6-7%2F427484916-44100-2-d0a8192cfe5da.mp3',
    published_at: '2026-07-07T00:55:10Z',
  },
  {
    id: 'e6',
    title: 'RD 27 Review: Spartans Win the League, Saints Go Bottom, End of An Era at Marconi',
    description: 'NPL NSW Round 27 review: Spartans clinch the league, Saints drop to the bottom, and the end of an era at Marconi.',
    type: 'episode',
    source: 'youtube',
    external_id: 'SE6iDJVWBE8',
    embed_url: 'https://www.youtube.com/embed/SE6iDJVWBE8',
    published_at: '2026-08-10T10:43:49Z',
  },
  {
    id: 'e7',
    title: 'RD 26: Marconi Lose...Again, Tigers & Parramatta Win, Life at Bankstown City',
    description: 'NPL NSW Round 26 review: Marconi’s losing streak continues, wins for Tigers and Parramatta, plus life at Bankstown City.',
    type: 'episode',
    source: 'youtube',
    external_id: 'bOKaac7QSYA',
    embed_url: 'https://www.youtube.com/embed/bOKaac7QSYA',
    published_at: '2026-08-04T02:25:11Z',
  },
  {
    id: 'e8',
    title: 'RD 25: Bankstown Derby Drama, Marconi & Utd Slip Up & the Business End Run in Discussion',
    description: 'NPL NSW Round 25 review: Bankstown derby drama, Marconi and United both slip up, plus the business end run-in.',
    type: 'episode',
    source: 'youtube',
    external_id: 'lIvfmPalb8g',
    embed_url: 'https://www.youtube.com/embed/lIvfmPalb8g',
    published_at: '2026-07-28T04:21:54Z',
  },
  {
    id: 'e9',
    title: 'RD 24: Title Race Heats Up, Will St George Survive? Mounties Promoted',
    description: 'NPL NSW Round 24 review: the title race heats up, can St George survive the drop, and Mounties are promoted.',
    type: 'episode',
    source: 'youtube',
    external_id: 'yfhGCw_B22Q',
    embed_url: 'https://www.youtube.com/embed/yfhGCw_B22Q',
    published_at: '2026-07-20T23:15:56Z',
  },
  {
    id: 'e10',
    title: 'NPL team Beats A-League team',
    description: '',
    type: 'short',
    source: 'youtube',
    external_id: 'S-UIzlYDbkc',
    embed_url: 'https://www.youtube.com/embed/S-UIzlYDbkc',
    published_at: '2026-08-11T21:16:41Z',
  },
  {
    id: 'e11',
    title: 'Football made easy in NPL NSW',
    description: '',
    type: 'short',
    source: 'youtube',
    external_id: 'qnVZGm2e8fE',
    embed_url: 'https://www.youtube.com/embed/qnVZGm2e8fE',
    published_at: '2026-08-11T08:16:06Z',
  },
]

// The Australian Championship doesn't start until 17 Oct 2026, so as a
// beta test the app runs on NPL NSW, League One Men's, and League Two
// Men's instead, all live right now. Standings pulled directly from
// api.dribl.com (Football NSW's competition platform) on 2026-08-10, real
// current data, not invented. standings-sync keeps this current once
// deployed; competitions.footballnsw.com.au/ladders shows the same numbers.
export const COMPETITIONS = ['NPL NSW', 'League One', 'League Two']

export const placeholderStandings = [
  { position: 1, team: 'APIA Leichhardt FC', competition: 'NPL NSW', played: 27, won: 19, drawn: 4, lost: 4, gf: 59, ga: 32, gd: 27, points: 61 },
  { position: 2, team: 'Sydney United 58 FC', competition: 'NPL NSW', played: 27, won: 18, drawn: 3, lost: 6, gf: 39, ga: 19, gd: 20, points: 57 },
  { position: 3, team: 'Marconi Stallions FC', competition: 'NPL NSW', played: 27, won: 17, drawn: 4, lost: 6, gf: 47, ga: 21, gd: 26, points: 55 },
  { position: 4, team: 'Sutherland Sharks FC', competition: 'NPL NSW', played: 27, won: 13, drawn: 4, lost: 10, gf: 43, ga: 34, gd: 9, points: 43 },
  { position: 5, team: 'Manly United FC', competition: 'NPL NSW', played: 27, won: 10, drawn: 8, lost: 9, gf: 33, ga: 31, gd: 2, points: 38 },
  { position: 6, team: 'SD Raiders FC', competition: 'NPL NSW', played: 27, won: 11, drawn: 5, lost: 11, gf: 41, ga: 44, gd: -3, points: 38 },
  { position: 7, team: 'Rockdale Ilinden FC', competition: 'NPL NSW', played: 27, won: 11, drawn: 4, lost: 12, gf: 42, ga: 40, gd: 2, points: 37 },
  { position: 8, team: 'Sydney FC', competition: 'NPL NSW', played: 27, won: 10, drawn: 7, lost: 10, gf: 35, ga: 39, gd: -4, points: 37 },
  { position: 9, team: 'Western Sydney Wanderers FC', competition: 'NPL NSW', played: 27, won: 10, drawn: 5, lost: 12, gf: 51, ga: 43, gd: 8, points: 35 },
  { position: 10, team: 'Blacktown City FC', competition: 'NPL NSW', played: 27, won: 9, drawn: 7, lost: 11, gf: 42, ga: 42, gd: 0, points: 34 },
  { position: 11, team: 'NWS Spirit FC', competition: 'NPL NSW', played: 27, won: 10, drawn: 4, lost: 13, gf: 31, ga: 37, gd: -6, points: 34 },
  { position: 12, team: 'St George City FA', competition: 'NPL NSW', played: 27, won: 9, drawn: 7, lost: 11, gf: 25, ga: 40, gd: -15, points: 34 },
  { position: 13, team: 'Wollongong Wolves FC', competition: 'NPL NSW', played: 27, won: 9, drawn: 5, lost: 13, gf: 30, ga: 38, gd: -8, points: 32 },
  { position: 14, team: 'UNSW FC', competition: 'NPL NSW', played: 27, won: 9, drawn: 4, lost: 14, gf: 38, ga: 45, gd: -7, points: 31 },
  { position: 15, team: 'Sydney Olympic FC', competition: 'NPL NSW', played: 27, won: 6, drawn: 4, lost: 17, gf: 30, ga: 58, gd: -28, points: 22 },
  { position: 16, team: 'St George FC', competition: 'NPL NSW', played: 27, won: 6, drawn: 3, lost: 18, gf: 25, ga: 48, gd: -23, points: 21 },

  { position: 1, team: 'Blacktown Spartans FC', competition: 'League One', played: 27, won: 19, drawn: 5, lost: 3, gf: 69, ga: 32, gd: 37, points: 62 },
  { position: 2, team: 'Northern Tigers FC', competition: 'League One', played: 27, won: 15, drawn: 7, lost: 5, gf: 48, ga: 27, gd: 21, points: 52 },
  { position: 3, team: 'Bankstown City FC', competition: 'League One', played: 27, won: 15, drawn: 5, lost: 7, gf: 51, ga: 40, gd: 11, points: 50 },
  { position: 4, team: 'Macarthur Rams FC', competition: 'League One', played: 27, won: 14, drawn: 6, lost: 7, gf: 36, ga: 28, gd: 8, points: 48 },
  { position: 5, team: 'Canterbury Bankstown FC', competition: 'League One', played: 27, won: 12, drawn: 6, lost: 9, gf: 61, ga: 48, gd: 13, points: 42 },
  { position: 6, team: 'Hills United FC', competition: 'League One', played: 27, won: 11, drawn: 7, lost: 9, gf: 49, ga: 43, gd: 6, points: 40 },
  { position: 7, team: 'Hakoah Sydney City East FC', competition: 'League One', played: 27, won: 9, drawn: 10, lost: 8, gf: 47, ga: 44, gd: 3, points: 37 },
  { position: 8, team: 'Rydalmere Lions FC', competition: 'League One', played: 27, won: 10, drawn: 7, lost: 10, gf: 38, ga: 40, gd: -2, points: 37 },
  { position: 9, team: 'Bulls FC Academy', competition: 'League One', played: 27, won: 11, drawn: 3, lost: 13, gf: 48, ga: 44, gd: 4, points: 36 },
  { position: 10, team: 'Hurstville Zagreb FC', competition: 'League One', played: 27, won: 10, drawn: 5, lost: 12, gf: 42, ga: 44, gd: -2, points: 35 },
  { position: 11, team: 'Inter Lions FC', competition: 'League One', played: 27, won: 8, drawn: 5, lost: 14, gf: 34, ga: 51, gd: -17, points: 29 },
  { position: 12, team: 'Newcastle Jets', competition: 'League One', played: 27, won: 6, drawn: 10, lost: 11, gf: 49, ga: 58, gd: -9, points: 28 },
  { position: 13, team: 'Central Coast Mariners FC', competition: 'League One', played: 27, won: 7, drawn: 7, lost: 13, gf: 43, ga: 55, gd: -12, points: 28 },
  { position: 14, team: 'Dulwich Hill FC', competition: 'League One', played: 27, won: 6, drawn: 9, lost: 12, gf: 35, ga: 52, gd: -17, points: 27 },
  { position: 15, team: 'Western City Rangers FC', competition: 'League One', played: 27, won: 5, drawn: 6, lost: 16, gf: 32, ga: 55, gd: -23, points: 21 },
  { position: 16, team: 'Prospect United SC', competition: 'League One', played: 27, won: 2, drawn: 14, lost: 11, gf: 26, ga: 47, gd: -21, points: 20 },

  { position: 1, team: 'Mounties Wanderers FC', competition: 'League Two', played: 25, won: 21, drawn: 2, lost: 2, gf: 92, ga: 26, gd: 66, points: 65 },
  { position: 2, team: 'Parramatta FC', competition: 'League Two', played: 25, won: 15, drawn: 3, lost: 7, gf: 64, ga: 35, gd: 29, points: 48 },
  { position: 3, team: 'Bonnyrigg White Eagles FC', competition: 'League Two', played: 25, won: 13, drawn: 4, lost: 8, gf: 48, ga: 38, gd: 10, points: 43 },
  { position: 4, team: 'Fraser Park FC', competition: 'League Two', played: 25, won: 12, drawn: 6, lost: 7, gf: 46, ga: 32, gd: 14, points: 42 },
  { position: 5, team: 'Dunbar Rovers FC', competition: 'League Two', played: 25, won: 12, drawn: 5, lost: 8, gf: 46, ga: 32, gd: 14, points: 41 },
  { position: 6, team: 'Central Coast United FC', competition: 'League Two', played: 25, won: 11, drawn: 5, lost: 9, gf: 42, ga: 42, gd: 0, points: 38 },
  { position: 7, team: 'Granville Rage', competition: 'League Two', played: 24, won: 11, drawn: 5, lost: 8, gf: 47, ga: 51, gd: -4, points: 38 },
  { position: 8, team: 'Sydney University SFC', competition: 'League Two', played: 26, won: 11, drawn: 4, lost: 11, gf: 45, ga: 38, gd: 7, points: 37 },
  { position: 9, team: 'South Coast Flame FC', competition: 'League Two', played: 25, won: 8, drawn: 7, lost: 10, gf: 31, ga: 35, gd: -4, points: 31 },
  { position: 10, team: 'Hawkesbury City FC', competition: 'League Two', played: 24, won: 9, drawn: 3, lost: 12, gf: 44, ga: 65, gd: -21, points: 30 },
  { position: 11, team: 'Inner West Hawks FC', competition: 'League Two', played: 25, won: 8, drawn: 4, lost: 13, gf: 36, ga: 43, gd: -7, points: 28 },
  { position: 12, team: 'Nepean FC', competition: 'League Two', played: 25, won: 8, drawn: 4, lost: 13, gf: 44, ga: 60, gd: -16, points: 28 },
  { position: 13, team: 'Gladesville Ryde Magic', competition: 'League Two', played: 26, won: 8, drawn: 1, lost: 17, gf: 37, ga: 66, gd: -29, points: 25 },
  { position: 14, team: 'Bankstown United FC', competition: 'League Two', played: 25, won: 6, drawn: 6, lost: 13, gf: 30, ga: 51, gd: -21, points: 24 },
  { position: 15, team: 'Camden Tigers FC', competition: 'League Two', played: 26, won: 2, drawn: 7, lost: 17, gf: 34, ga: 72, gd: -38, points: 13 },
]

// Same source, most recent completed round per competition.
export const placeholderResults = [
  { id: 'pmvvw1jYym', competition: 'NPL NSW', round: 'Round 27', home_team: 'Wollongong Wolves FC', away_team: 'Sydney United 58 FC', home_score: 1, away_score: 2, played_at: '2026-08-08T19:00:00Z', ground: 'Macedonia Park, Berkeley' },
  { id: 'nmYnZrwA3N', competition: 'NPL NSW', round: 'Round 27', home_team: 'St George City FA', away_team: 'Rockdale Ilinden FC', home_score: 1, away_score: 0, played_at: '2026-08-07T23:15:00Z', ground: 'Penshurst Park' },
  { id: 'gdM6Ew5eZm', competition: 'NPL NSW', round: 'Round 27', home_team: 'St George FC', away_team: 'APIA Leichhardt FC', home_score: 0, away_score: 0, played_at: '2026-08-07T22:30:00Z', ground: 'Barton Park' },
  { id: 'lNbJjA8BEN', competition: 'League One', round: 'Round 27', home_team: 'Bankstown City FC', away_team: 'Hurstville Zagreb FC', home_score: 2, away_score: 0, played_at: '2026-08-07T21:00:00Z', ground: 'Jensen Park' },
  { id: 'pmvvw1Z18m', competition: 'League One', round: 'Round 27', home_team: 'Dulwich Hill FC', away_team: 'Macarthur Rams FC', home_score: 1, away_score: 2, played_at: '2026-08-07T21:00:00Z', ground: 'Arlington Oval' },
  { id: 'OmepXyaxjd', competition: 'League One', round: 'Round 27', home_team: 'Newcastle Jets', away_team: 'Central Coast Mariners FC', home_score: 1, away_score: 1, played_at: '2026-08-07T21:00:00Z', ground: 'Lake Macquarie Regional Football Facility' },
  { id: 'MNGJxwenbm', competition: 'League Two', round: 'Round 27', home_team: 'Dunbar Rovers FC', away_team: 'Gladesville Ryde Magic', home_score: 6, away_score: 0, played_at: '2026-08-07T23:00:00Z', ground: 'Rockdale Ilinden Sports Centre' },
  { id: 'vmZp97OnLK', competition: 'League Two', round: 'Round 27', home_team: 'Bonnyrigg White Eagles FC', away_team: 'Camden Tigers FC', home_score: 4, away_score: 0, played_at: '2026-08-07T23:00:00Z', ground: 'Bonnyrigg Sports Club' },
  { id: 'BdDb9JlvJN', competition: 'League Two', round: 'Round 27', home_team: 'Sydney University SFC', away_team: 'Nepean FC', home_score: 4, away_score: 1, played_at: '2026-08-07T21:00:00Z', ground: 'Sydney University Football Ground' },
]

// From Dribl's "Top Goal Scorers" moment (Golden Boot style leaderboard),
// same source as standings/results, pulled live 2026-08-11. No assists
// data exists for any of these three competitions on this platform.
export const placeholderTopScorers = [
  { id: 'nmYnXOOD1N', competition: 'NPL NSW', player_name: 'Awan Lual', club_name: 'Western Sydney Wanderers FC', goals: 20, image_url: 'https://ocean.dribl.com/167570fafe364779bcecbc9fe2c2d33c' },
  { id: 'Vdz1JOb5BK', competition: 'NPL NSW', player_name: 'Presley Ortiz', club_name: 'APIA Leichhardt FC', goals: 17, image_url: 'https://ocean.dribl.com/68cd935e641a4bd2a94f4363786666ad' },
  { id: 'lNba84O3mx', competition: 'NPL NSW', player_name: 'Damian Tsekenis', club_name: 'Marconi Stallions FC', goals: 15, image_url: 'https://ocean.dribl.com/0a4c1209e80740988c3918b0ecea00b1' },
  { id: '8NOpjnX3WK', competition: 'NPL NSW', player_name: 'Moudi Najjar', club_name: 'Rockdale Ilinden FC', goals: 14, image_url: 'https://ocean.dribl.com/3ef07888684946ebbb59c22bf1d437e1' },
  { id: 'jmap1A10dR', competition: 'NPL NSW', player_name: 'Travis Major', club_name: 'Blacktown City FC', goals: 12, image_url: 'https://ocean.dribl.com/82bcc0c009d44362b97303f08f6f7d43' },
  { id: 'jdylVLaLK5', competition: 'League One', player_name: 'Aedon Kyra', club_name: 'Blacktown Spartans FC', goals: 21, image_url: 'https://ocean.dribl.com/627af1914525447f83bd5ddc9567eda8' },
  { id: 'xNxWk9Jbmk', competition: 'League One', player_name: 'William Kounnas', club_name: 'Canterbury Bankstown FC', goals: 20, image_url: 'https://ocean.dribl.com/1c627c58c8ae4a46a21ea30af35e5104' },
  { id: 'nmYJAoraNz', competition: 'League One', player_name: 'Alessandro Lacalandra', club_name: 'Hurstville Zagreb FC', goals: 17, image_url: 'https://ocean.dribl.com/220f0e48fa5a4d4fa92364641888329f' },
  { id: 'EN2pD73EBd', competition: 'League One', player_name: 'Chan Yelchan', club_name: 'Macarthur Rams FC', goals: 14, image_url: 'https://ocean.dribl.com/253bc555cb994928a48cfd2ae22603d9' },
  { id: 'yKJJ15eBXK', competition: 'League One', player_name: 'Darcy Ellem', club_name: 'Blacktown Spartans FC', goals: 14, image_url: 'https://ocean.dribl.com/c81b1595cb314ac09e336bba01170fd0' },
  { id: 'OmepJ5Gj0d', competition: 'League Two', player_name: 'Patrick Antelmi', club_name: 'Mounties Wanderers FC', goals: 29, image_url: 'https://ocean.dribl.com/fcd94c36e9244ca082f8fb30f583d6ac' },
  { id: 'ld44jy9DdW', competition: 'League Two', player_name: 'Marco Sama', club_name: 'Parramatta FC', goals: 22, image_url: 'https://ocean.dribl.com/41fd05f4705e4858a6b119a514c67636' },
  { id: 'ZKRyZJv7rN', competition: 'League Two', player_name: 'Toby Witjes', club_name: 'Nepean FC', goals: 18, image_url: 'https://ocean.dribl.com/1fccd2799ac04f19b5e107609df870a3' },
  { id: 'xm8ZGpzezK', competition: 'League Two', player_name: 'Isaac Folkes', club_name: 'Sydney University SFC', goals: 15, image_url: 'https://ocean.dribl.com/a55f544ae7a54584a35c0c76d1eb7ac9' },
  { id: 'nmYJA3xyNz', competition: 'League Two', player_name: 'Daniel Bittar', club_name: 'Bonnyrigg White Eagles FC', goals: 14, image_url: 'https://ocean.dribl.com/4a5bdb2099d94c4abf6fc2de3cd8930e' },
]

// Real upcoming/recent fixtures pulled live from Dribl on 2026-08-11, to
// preview all three states a fixture can be in: scheduled (open to pick),
// locked (kicked off, no result yet), completed (scored).
export const placeholderFixtures = [
  { id: 'x1', competition: 'NPL NSW', round: 'Round 28', home_team: 'Sydney FC', away_team: 'St George City FA', kickoff_at: '2026-08-14T09:30:00Z', status: 'scheduled' },
  { id: 'x2', competition: 'League One', round: 'Round 28', home_team: 'Macarthur Rams FC', away_team: 'Blacktown Spartans FC', kickoff_at: '2026-08-15T06:30:00Z', status: 'scheduled' },
  { id: 'x3', competition: 'League Two', round: 'Round 24', home_team: 'Granville Rage', away_team: 'Hawkesbury City FC', kickoff_at: '2026-08-11T10:00:00Z', status: 'scheduled' },
  { id: 'x4', competition: 'NPL NSW', round: 'Round 27', home_team: 'Marconi Stallions FC', away_team: 'Sydney FC', kickoff_at: '2026-08-09T05:00:00Z', status: 'locked' },
  { id: 'x5', competition: 'NPL NSW', round: 'Round 27', home_team: 'Wollongong Wolves FC', away_team: 'Sydney United 58 FC', kickoff_at: '2026-08-09T05:00:00Z', home_score: 1, away_score: 2, status: 'completed' },
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
    headline: 'Love Souvlaki? Try the Champagne Pack, $89',
    cta: 'Order Now',
    image: '/sponsors/souvlaki-boys.jpg',
    link_url: 'https://souvlakiboys.com.au/',
  },
]
