# CFLB MVP: Championship Match Predictor

**Date:** 2026-10-16
**Status:** Design approved in conversation, awaiting written-spec review
**Launch target:** live by Sat 17 Oct 2026, ahead of Round 2 (picks lock Thu 22 Oct, 7:30pm AEDT)

## Why

The app grew into a full fan hub (news, podcast, table, live scores, your-team, reporter tools, jokers, form guides). Gaz wants it stripped back to one job: a simple Australian Championship match predictor whose real purpose is **collecting consented emails**. People sign in to save picks, climb a leaderboard and pull mates in through private leagues. The resulting list and engagement numbers are the pitch to betting-app sponsors.

**Success:** a growing list of contactable, consented emails, plus signup and per-round participation numbers Gaz can show a sponsor.

## Decisions (agreed)

| Topic | Decision |
|---|---|
| Launch round | Round 2. Round 1 runs on the current app untouched. |
| Consent | Two separate opt-ins at signup: CFLB emails, and partner/sponsor offers. Both unticked by default. |
| Signup timing | Pick first, sign up to save. |
| Leaderboards | Overall board plus private leagues joined by share link. |
| Build approach | New lean frontend in this repo, reusing the existing Supabase backend. Old pages switched off, not deleted. |
| Look | Option C, "Bet slip": light, rounded, white match cards on soft green, CFLB logo in a bottle-green header. |
| Sign-in methods | Unchanged: Google, or email and password. |
| Scoring | Unchanged: 3 points exact score, 1 point correct result. Joker removed from the UI. |
| Existing users (24) | Shown the two opt-ins once, next time they open the app. |

## Out of scope

News, podcast, table/standings, live scores, Your Team, form guide, the step-by-step wizard, Joker, Last Week table, beat-the-host, sponsor slots, reporter tools, YouTube/SBS watch links. Routes and components stay in the codebase behind a flag; the backend sync jobs for them keep running.

## Screens

### 1. Picks (`/`)
- Bottle-green header: CFLB logo, countdown pill ("6d 4h to lock"), "Round N picks", one-line scoring rule.
- The round's 8 featured Championship fixtures as white cards, in kickoff order. Each card: kickoff day and time, both crests, team names, a − / + stepper per team (44px minimum touch targets). Scores start blank, not 0, so "picked" is unambiguous.
- Fixed bottom bar: "N of 8 picked" and **Lock in picks**, enabled once all 8 have both scores.
- After lock-in, before lock: cards show the saved picks read-only, with an **Edit picks** button.
- After lock: cards show the pick, the real score once known, and points earned (+3 / +1 / 0).
- No round available: "Round N fixtures coming soon".

### 2. Sign-up sheet
- Slides up when a signed-out user taps Lock in. Copy: "Save your picks and get on the leaderboard."
- Continue with Google, or email + password + display name.
- Two unticked checkboxes with fixed, versioned wording:
  - "Send me CFLB emails: round reminders, results and banter."
  - "Send me offers from CFLB's partners and sponsors."
- Picks are held in `localStorage` while signing up (survives the Google redirect) and saved the moment auth completes, then cleared locally.

### 3. Leaderboard (`/leaderboard`)
- Tabs: Overall, then one per league the user belongs to.
- Columns: position, name, points, exact scores. Top 50 plus the user's own row, highlighted and pinned if outside the top 50.
- Empty board: "No points yet. Round N results land after the first game."

### 4. Leagues
- On the Leaderboard screen: **Create a league** (name only), producing a share link `/join/<CODE>` and a native share button (Web Share API, copy-link fallback).
- `/join/<CODE>`: shows "Join <league name>". Signed in: one tap joins. Signed out: goes to Picks with the join remembered; after signup they're added automatically.
- Leave league stays available from the league tab.

### 5. Sponsor stats (`/stats`, admin only, not in nav)
- Total signups, CFLB opt-in count, partner opt-in count, signups per day (last 30 days), players with picks per round.
- **Download CSV** buttons: CFLB opt-ins, partner opt-ins. Only opted-in users, with name, email, consent timestamp and wording version.

### Navigation
Bottom tab bar: **Picks**, **Leaderboard**. Small header menu: sign out. Push notification links to `/predictions` keep working via an alias route.

## Backend changes

### Consent (migration)
Add to `profiles`:
- `marketing_opt_in boolean` (null = not yet asked)
- `partner_opt_in boolean` (null = not yet asked)
- `consent_at timestamptz`
- `consent_version text` (identifies the exact checkbox wording shown)

Users update only their own consent fields (existing profile RLS). Null in either field triggers the one-time consent prompt for existing users.

### Round lock enforced in the database (migration)
Replace the predictions insert/update policies so a pick is accepted only if the fixture is featured, is a Championship fixture, and `now()` is before the **earliest kickoff among the currently featured fixtures**. This closes the gap where per-fixture `status` lags behind kickoff until the next sync, and matches the round-level lock the UI shows.

### Leaderboard
- `leaderboard` view already counts Championship picks only (migration `20261008090000`).
- Reset `profiles.last_rank` to null so the first scored round doesn't announce movement against NPL positions.
- League tables read the same view filtered to league members (as today).

### Leagues: join by code (migration)
A `security definer` function `join_league_by_code(code text)` that looks up the league and inserts the caller into `league_members`, returning the league id and name. A companion `league_preview(code text)` returns just the name for the join screen. This avoids loosening `leagues` RLS.

### Admin stats (migration)
- `profiles.is_admin boolean default false`, set true for Gaz's account (and anyone else named).
- `security definer` functions `admin_stats()` and `admin_optin_export(kind text)` that raise unless the caller is an admin. Export reads emails from `auth.users`, joined to profiles, filtered to the requested opt-in being true.

### Unchanged
Football Australia sync (`standings-sync`), scoring, round featuring, push notifications, auth.

## Frontend structure

A new `src/mvp/` area so the lean app doesn't tangle with the old pages:
- `MvpLayout` (green header, bottom tabs, consent gate for existing users)
- `PicksPage`, `MatchCard`, `ScoreStepper`, `LockBar`, `SignUpSheet`
- `LeaderboardPage`, `LeagueTabs`, `CreateLeague`, `JoinLeaguePage`
- `StatsPage`
- `lib/pendingPicks.js` (localStorage hold/restore), `lib/consent.js` (wording + version constant)
- Crests: a static map from FFA team name to the club crest URL on australianchampionship.com.au, with the existing monogram fallback (`TeamCrest`) when a name isn't mapped.

`App.jsx` routes `/`, `/leaderboard`, `/join/:code`, `/stats`, `/sign-in`, and `/predictions` (alias to `/`) through `MvpLayout`. An `MVP_MODE` flag in `featureFlags.js` switches between the MVP routes and the old app, so the old app can be restored without code changes.

## Error handling
- Saving picks fails after signup: picks stay in `localStorage`, an inline error shows with **Try again**.
- Pick rejected by the lock policy: "Picks for this round are locked" and the page refreshes into its locked state.
- Invalid or unknown league code: "That league link doesn't work. Ask your mate to share it again."
- Feed has no fixtures yet: "Round N fixtures coming soon" (no stale data).

## Testing
- Unit tests with Vitest (added as a dev dependency; the project has no test runner yet) for: pick completeness, round lock time, pending-picks save/restore, points display.
- Database checks run against the live project with a test account: a pick after the round lock is rejected; `join_league_by_code` works for a non-member; `admin_stats` refuses a non-admin.
- Manual run-through at phone width: pick 8 signed out, sign up with both boxes ticked, picks persist; sign up via Google round-trip, picks persist; create a league, join from a second account via the link; stats page counts both and the CSVs contain only opted-in users.

## Open risks
- Crest images are hotlinked from australianchampionship.com.au. If they move, cards fall back to monograms. Copying them into `public/` is a follow-up if that happens.
- Partner-offer consent covers CFLB passing offers on. If a sponsor wants to receive the list directly, the wording needs to name that and should be checked before launch, along with wagering advertising rules.
