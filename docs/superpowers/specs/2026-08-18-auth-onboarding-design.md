# Auth / Onboarding Design

## Purpose

Today, signing in only asks for a leaderboard display name, and only if the
user happens to land on the Predictions page. There's no capture of role
(player/coach/fan), team, league, or age group, so the personalized Home
dashboard (`MyTeamDashboard`, driven by `profiles.followed_team`) only ever
gets populated for someone who manually visited Predictions and filled in a
name. This also means CFLB has no data on who's actually using it (how many
players vs coaches vs fans, which clubs, which leagues) beyond "someone
signed in."

Separately, the sign-in entry point itself is not obvious: tapping "Sign In"
in the header routes to `/predictions`, where the Google button sits below
other page content and needs a scroll to find.

This spec covers: a dedicated sign-in screen, and a first-sign-in onboarding
flow that captures role/team/league/age-group once, gated app-wide (not just
on the Predictions page).

Session persistence itself is not in scope — Supabase's client already
persists sessions to `localStorage` by default with no overrides in this
codebase, so repeated sign-in prompts were not a confirmed bug.

## Data model

Migration adds four columns to `profiles`:

```sql
alter table profiles
  add column if not exists role text check (role in ('player', 'coach', 'fan')),
  add column if not exists league text,
  add column if not exists age_group text check (age_group in ('first_grade', '20s', '18s', '16s')),
  add column if not exists marketing_opt_in boolean not null default true;
```

- `role`: null until onboarding completes (used as the "has this user
  onboarded" signal, see Gating below).
- `league`: the competition name they follow/play/coach in. Null for fans
  (fans only pick a team, not a league). Free text, same pattern as
  `standings.competition` — not a foreign key, matching the existing
  `followed_team` free-text convention noted in schema.sql.
- `age_group`: only set for player/coach. Null for fans.
- `marketing_opt_in`: defaults true (opt-out model, per the checkbox being
  checked by default). No email automation reads this yet — it exists to
  capture consent now so it's ready when that's built.
- `followed_team` (existing column) is reused for team name across all three
  roles: the team a player plays for, a coach coaches, or a fan follows.

## Sign-in entry point

New route `/sign-in`, rendered by a new `SignInPage`:

- Google button and the existing email-magic-link form, both above the fold,
  nothing else on the page competing for space.
- Reuses `auth.signInWithGoogle` / `auth.signInWithEmail` from
  `AuthContext` as-is — no changes to the auth context itself.
- `Layout`'s header "Sign In" link changes from `to="/predictions"` to
  `to="/sign-in"`.
- On successful auth, `AuthContext`'s `onAuthStateChange` fires as normal;
  `SignInPage` redirects to `/` (Home) once `auth.user` is set, using
  `useEffect` + `useNavigate`. If a profile doesn't exist yet, the
  onboarding gate (below) takes over immediately since it wraps the whole
  app, not just this page.

## Onboarding gate

New component `OnboardingGate`, rendered in `Layout` wrapping `<Outlet />`:

```jsx
const { profile, checked } = useMyProfile(auth?.user?.id)
const needsOnboarding = auth?.user && checked && !profile

if (needsOnboarding) return <OnboardingFlow userId={auth.user.id} onComplete={...} />
return <Outlet />
```

This replaces the existing inline "pick a display name" card currently
living in `PredictionsPage` (the `needsDisplayName` block around line 232 /
267-282) — that logic and markup move into `OnboardingFlow` and get deleted
from `PredictionsPage`. The trigger condition is identical
(`profileChecked && !profile`), just evaluated once at the app shell level
instead of per-page, so it fires regardless of which tab a first-time user
lands on after Google sign-in.

`useMyProfile` is already a shared hook (`src/hooks/useMyProfile.js`) reading
`profiles` by id — `Layout` will call it directly rather than duplicating
the query.

## Onboarding flow

New component `OnboardingFlow`, full-screen, one step visible at a time,
internal `useState` step index, no routing (it's a gate, not a page — URL
stays wherever the user was).

**Step 1 — Display name**
Same validation as today's inline version: required, max 30 chars, saved as
`display_name`. Not yet submitted to Supabase — held in local state until
the final submit (see below), so a user who drops off mid-flow doesn't end
up with a half-filled profile row blocking them differently next time (they
still have no `profile` row at all, so the gate just restarts cleanly).

**Step 2 — Role**
Three tap-select cards: Player / Coach / Fan.

**Step 3a — Player or Coach path**
- League: dropdown populated from `select distinct competition from
  standings order by competition`, fetched once when `OnboardingFlow` mounts.
  Includes a trailing "Other" option (free-text input appears if selected) —
  needed because not every state's competitions are synced into `standings`
  yet, and the product's audience is explicitly multi-state, not NSW-only.
- Team: dropdown populated from `select team from standings where
  competition = :league order by team`. If "Other" was chosen for league,
  this becomes a free-text input instead.
- Age group: First Grade / 20s / 18s / 16s (tap-select, same pattern as
  role).

**Step 3b — Fan path**
- Team: single dropdown, `select team, competition from standings order by
  competition, team`, grouped by competition in the dropdown (`<optgroup>`)
  so it's browsable across all synced leagues at once. No league or
  age-group step.

**Step 4 — Marketing opt-in**
Single checkbox, checked by default: "Keep me posted about new episodes and
features" (copy can change at build time). Unchecking sets
`marketing_opt_in: false`.

**Submit**
One upsert:

```js
supabase.from('profiles').upsert({
  id: userId,
  display_name,
  role,
  league: role === 'fan' ? null : league,
  followed_team: team,
  age_group: role === 'fan' ? null : age_group,
  marketing_opt_in,
})
```

On success, call `onComplete(data)` (passed down from `OnboardingGate`) so
the gate re-renders with a real `profile` and falls through to `<Outlet />`
— no page reload, no redirect needed.

## Error handling

- League/team fetch failure (Supabase down or misconfigured): steps 3a/3b
  fall back to a free-text input for team, skip the league dropdown
  entirely, and league is left null — same degraded-but-usable pattern the
  rest of the app uses when `isSupabaseConfigured` is false.
- Submit failure: show the existing `auth-note auth-note--error` pattern
  inline on the final step, don't clear entered values, let them retry.

## What doesn't change

- `AuthContext` — no changes. `signInWithGoogle`, `signInWithEmail`,
  `signOut`, session persistence all stay as-is.
- `MyTeamDashboard` and anything else already reading `profiles.followed_team`
  — no changes needed, they just start getting populated for every
  signed-in user now instead of only ones who visited Predictions.
- No changes to `predictions`, `leagues`, or other tables.

## Testing

- Manual: sign in with a fresh Google account (or clear the `profiles` row
  for a test user), confirm the onboarding gate fires on whichever tab
  they land on, confirm both the player/coach path and fan path save
  correctly, confirm a completed profile never re-triggers the gate.
- Manual: sign in with Supabase unset (`isSupabaseConfigured === false`),
  confirm the flow doesn't crash (mirrors existing preview-mode handling
  elsewhere in the app).
