# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Fans of Australian state-level football leagues (National Premier Leagues and equivalents across states, not limited to NSW). They currently have to chase news, podcasts, and standings across many separate club and league sites; CFLB gives them one place to check instead.

## Product Purpose

Champagne Football Lemonade Banter (CFLB) aggregates Australian state-league football content — news, podcast episodes, and league standings — into a single feed, and layers a score-prediction game with a leaderboard on top to give fans a reason to return regularly, not just during big rounds.

## Positioning

The combination is the mechanism: aggregation alone (a news feed) or a prediction game alone (common in top-flight leagues) both exist separately, but nobody stitches Australian state-league content aggregation together with a lightweight prediction/leaderboard game for this specific, underserved tier of football.

## Operating Context

- Content sources are synced server-side via Supabase Edge Functions (`supabase/functions/news-sync`, `podcast-sync`, `standings-sync`) rather than fetched live client-side.
- Users sign in via Google OAuth or an emailed magic link (Supabase Auth) to save predictions and appear on the leaderboard; browsing news/podcast/table does not require sign-in.
- Four surfaces: News (home), Podcast, Table (standings), Predictions (fixtures + leaderboard, auth-gated to save picks).

## Capabilities and Constraints

- Stack: React 19 + Vite + React Router, Supabase (Postgres, Auth, Edge Functions) as backend.
- Predictions currently store per-fixture home/away scorelines; without Supabase configured or a signed-in user, picks are local-only (not persisted) and the app tells the user so.
- Sponsor placements exist in the code at header, feed, and sidebar slots (`src/components/SponsorShowcase.jsx`, `SponsorModule.jsx`) as a real monetization mechanic — kept in the codebase but switched off via `SPONSORS_ENABLED` in `src/lib/featureFlags.js` for the beta, so early testers see a clean, unbranded product. Flip the flag back on post-beta rather than re-add the slots from scratch.
- No confirmed constraints beyond the above; the user was not able to name additional binding constraints at init time.

## Evidence on Hand

- `src/lib/placeholderData.js` news entries are a real snapshot pulled from confirmed sources (NPL Men's NSW, HIGHPRESS) on 2026-08-03, not invented examples — representative of actual aggregator output, though state-specific (NSW) rather than the broader multi-state audience confirmed above.
- The podcast is real: "The Champagne Football Show with Gaz & Chaz" (Gary Rafferty & Chaz Samushonga), hosted on Acast, distributed via Anchor RSS (`https://anchor.fm/s/10ab793e0/podcast/rss`, confirmed 2026-08-07, 113 episodes live). YouTube channel `UCbfWQYNp7XBsreEFSukTWlQ`, Instagram `@champagnefootballshow`. `placeholderData.js`'s episode entries are the 5 real latest episodes (RD 22–26) pulled from that feed, not sample copy. The RSS `<guid>` is Anchor's internal id, not a public Spotify episode id — episode playback uses the feed's real audio enclosure, not a Spotify iframe.
- Real episode descriptions in the feed carry sponsor/affiliate mentions (e.g. an Isagenix discount code) — evidence the show already runs affiliate reads, separate from the site's own sponsor slots.
- Site sponsor slots hold 3 real, confirmed sponsors (2026-08-07): Football Fitness AU (header — Gaz's own coaching business), Premiership Experience (feed), Souvlaki Boys (sidebar — also mentioned organically as a show sponsor in real episode show notes). No logo images supplied yet; slots render the sponsor name as text until logos arrive.
- Real brand logo confirmed and applied (2026-08-07): `public/logo.png` (full illustrated mark) and `public/favicon.png` (cropped bottle+ball icon), both real assets, not placeholders.
- Standings, fixtures, and leaderboard entries in the same file are placeholder/sample data, not real content — future design and copy work must not treat them as evidence of real teams or scores.
- No existing testimonials, press, case studies, or user research on hand.

## Product Principles

- Aggregation is the retention floor; the prediction game is the reason to come back between rounds.
- Design for state-league football broadly — don't let NSW-specific sample data narrow the product's actual multi-state scope.
- Sign-in friction should stay low: browsing is open, auth is only asked for at the point predictions need to persist.
- Sponsor slots are a real monetization surface and should read as legitimate placements, not filler.
