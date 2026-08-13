# Champagne Nine — step-by-step prediction wizard

## Context

The home page (`PredictionsPage.jsx`) currently shows all "featured" fixtures
as a flat list users fill in one after another, then submits everything at
once. It's functional but flat — no sense of occasion, no per-team context
beyond the crest and name, and the section is just labelled "Predictions".

This redesigns that section into a named, step-by-step prediction event:
**Champagne Nine**.

## Scope

- 9 curated fixtures per round: 4 NPL NSW, 3 League One, 2 League Two.
  Curation stays manual via the existing `fixtures.featured` flag — this is
  an editorial step, not something the code selects automatically. Update
  the count from 12 to 9 (schema comment + on-page copy).
- Replaces the current flat fixture-list block in `PredictionsPageContent`.
  Stays on the same route/page (Predictions is already the home page).
- Also fixes an unrelated bug while in this codebase: two recent YouTube
  Shorts were showing in the Podcast page's "Previous Episodes" list because
  they synced before the Shorts-vs-episode duration check existed, and the
  sync's `ignoreDuplicates: true` upsert meant re-syncing never corrected
  already-stored rows. Fixed via a backfill migration + changing the upsert
  to update on conflict. (Already implemented — see
  `supabase/migrations/20260813160000_backfill_short_types.sql` and
  `supabase/functions/podcast-sync/index.ts`.)

## Flow

### 1. Wizard (not yet submitted this round)

One fixture at a time, in fixed order: NPL NSW (4) → League One (3) →
League Two (2).

Each step shows:
- Competition badge + kickoff time
- Home team: crest, name, form strip (last 5 results as W/D/L pips),
  current league position
- Away team: same
- A `ScoreStepper` per team (existing +/− component, reused as-is)
- Progress dots (1–9) across the top, each clickable to jump back to any
  **completed** step (steps not yet reached aren't clickable)
- "Next" button advances to the next fixture, defaulting to 0-0 if the
  stepper wasn't touched (matches current submit behavior)

Form/position data reuses `useCompetitionData` (standings + results). The
`computeForm` logic currently living inside `CompetitionReference.jsx` gets
extracted into a shared helper (e.g. `src/lib/form.js`) so both the
reference table and the wizard read from one implementation, not two.

### 2. Summary screen

After the 9th fixture, a compact list of all 9 picks (crest, team name,
score, per row), each row with an "Edit" action that jumps back into the
wizard at that step. One "Submit Champagne Nine" button submits all 9 picks
via the existing `submitAllPicks` upsert logic (unchanged).

### 3. Locked / submitted state

On page load, if the signed-in user's saved predictions already cover all 9
of the current round's fixture ids, skip the wizard and summary and render
the locked view directly — no new query, this reuses `myPredictions` and
`upcoming` (already fetched).

Locked view: same compact per-fixture display as the summary, but read-only,
plus **"X% picked the same result"** per fixture — win/draw/loss agreement
between the user's pick and everyone else's, not exact scoreline (exact
scoreline agreement is sparser and less interesting as a stat at this scale).

## Data changes

New public view, `fixture_result_stats`, following the exact pattern the
existing `leaderboard` view uses — aggregated counts only, so it doesn't
need to (and shouldn't) touch the RLS policy that restricts row-level
`predictions` access to each user's own rows:

```sql
create or replace view fixture_result_stats as
  select
    fixture_id,
    case
      when home_score_pick > away_score_pick then 'home'
      when home_score_pick < away_score_pick then 'away'
      else 'draw'
    end as predicted_result,
    count(*) as pick_count
  from predictions
  group by fixture_id, predicted_result;
```

The locked view computes each fixture's "X% picked the same result" client
-side from this view: sum all `pick_count` rows for the fixture for the
total, then `predicted_result` matching the user's own pick's result for the
numerator.

No other schema changes. `fixtures`, `predictions`, `standings`, `results`
tables are unchanged.

## Components

- `ChampagneNineWizard.jsx` (new) — step-by-step picker, owns the current
  step index and progress-dot navigation. Renders one fixture step at a
  time using extracted `FixtureStep` (home/away team blocks + steppers).
- `ChampagneNineSummary.jsx` (new) — shared by both the pre-submit summary
  and the post-submit locked view (a `locked` prop toggles Edit links vs.
  the result-agreement stat).
- `src/lib/form.js` (new) — `computeForm(team, results, competition)`
  extracted from `CompetitionReference.jsx`; both files import it.
- `PredictionsPageContent` in `PredictionsPage.jsx` — replaces the current
  `<div className="fixture-list">` block with `<ChampagneNineWizard />` or
  `<ChampagneNineSummary locked />` depending on submission state. Auth,
  profile, leaderboard, awaiting-result and recently-decided sections stay
  as they are today.

## Out of scope

- No changes to scoring (3 pts exact, 1 pt result — unchanged).
- No changes to how fixtures get marked `featured` (still manual).
- No changes to leaderboard, mini-leagues, or the flash reporter.
