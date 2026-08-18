# Auth Sign-In Entry Point + First-Run Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give CFLB a dedicated, obvious sign-in screen and a first-sign-in onboarding flow that captures role (player/coach/fan), league, team, and age group, gated app-wide instead of only on the Predictions page.

**Architecture:** A new `/sign-in` route replaces routing the header's "Sign In" link to `/predictions`. A new `OnboardingGate` component, mounted in `Layout` around `<Outlet />`, checks whether the signed-in user has a `profiles` row; if not, it renders a new full-screen `OnboardingFlow` wizard instead of the requested page. `OnboardingFlow` collects display name, role, league/team/age-group (or just team, for fans), and a marketing opt-in, then does one `profiles` upsert. The existing inline "pick a display name" block in `PredictionsPage` is deleted since the gate now covers that case globally.

**Tech Stack:** React 19 + Vite + React Router 7, Supabase (Postgres + Auth) via `@supabase/supabase-js`. No automated test framework exists in this repo (`package.json` has no test runner) — verification throughout this plan is `npm run build` (catches syntax/import errors) plus manual QA in the dev server (`npm run dev`), matching how prior features in this codebase were verified (see recent commit history — no `*.test.*` files anywhere in the repo).

**Spec:** [docs/superpowers/specs/2026-08-18-auth-onboarding-design.md](../specs/2026-08-18-auth-onboarding-design.md)

## Global Constraints

- No automated tests exist in this repo — every task's "testing" step is `npm run build` plus a manual QA description, not a unit test.
- `role` is `'player' | 'coach' | 'fan'`, `age_group` is `'first_grade' | '20s' | '18s' | '16s'` — these exact string values, used consistently across the migration, `OnboardingFlow`, and any later code that reads them.
- `league` and `age_group` are `null` for fans (spec: "Data model").
- `followed_team` (existing `profiles` column) is reused for team name across all three roles — no new team column.
- All new UI follows `DESIGN.md`: near-black ground, hairline rules (`var(--border)`) instead of filled cards, `--font-splash` (Anton) for step headlines, `--accent` green for the selected/active state, zero border-radius, 44px minimum touch targets.
- When `isSupabaseConfigured` is `false`, nothing may crash — fall back the same way `PredictionsPage` and `NewsPage` already do (placeholder data / disabled actions), per spec's "Error handling" section.

---

### Task 1: Add onboarding columns to `profiles`

**Files:**
- Create: `supabase/migrations/20260818090000_profile_onboarding_fields.sql`

**Interfaces:**
- Produces: `profiles.role` (`text`, nullable, check `in ('player', 'coach', 'fan')`), `profiles.league` (`text`, nullable), `profiles.age_group` (`text`, nullable, check `in ('first_grade', '20s', '18s', '16s')`), `profiles.marketing_opt_in` (`boolean not null default true`). Every later task that upserts or reads a profile uses exactly these column names and value sets.

- [ ] **Step 1: Check the latest existing migration timestamp so the new one sorts after it**

Run: `ls supabase/migrations | tail -3`
Expected: the newest file's timestamp prefix is earlier than `20260818090000` (today's date). If not, bump the new filename's timestamp to sort after the latest existing migration — migrations run in filename order.

- [ ] **Step 2: Write the migration**

```sql
-- Onboarding fields captured at first sign-in: role, league, team (reuses
-- existing followed_team), age group, and marketing consent. All nullable
-- except marketing_opt_in — a row with role = null means the user hasn't
-- completed onboarding yet (see OnboardingGate in the app).
alter table profiles
  add column if not exists role text check (role in ('player', 'coach', 'fan')),
  add column if not exists league text,
  add column if not exists age_group text check (age_group in ('first_grade', '20s', '18s', '16s')),
  add column if not exists marketing_opt_in boolean not null default true;
```

- [ ] **Step 3: Apply the migration**

Run: `supabase db push`
Expected: migration applies with no errors. If the Supabase CLI isn't linked to a project in this environment, instead run `supabase db lint supabase/migrations/20260818090000_profile_onboarding_fields.sql` (or open the file and confirm the SQL is valid Postgres by eye against the existing `profiles` table definition in `supabase/schema.sql:156-173`) and note in the commit message that it wasn't applied to a live database.

- [ ] **Step 4: Update `supabase/schema.sql` to match**

Add the four columns to the `profiles` table definition at `supabase/schema.sql:156-173` (the checked-in schema snapshot other tasks/readers rely on for the full picture):

```sql
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  last_rank int,
  is_reporter boolean not null default false,
  is_host boolean not null default false,
  followed_team text,
  -- Onboarding fields, captured once at first sign-in. role = null means
  -- the user hasn't completed onboarding yet (see OnboardingGate).
  role text check (role in ('player', 'coach', 'fan')),
  league text,
  age_group text check (age_group in ('first_grade', '20s', '18s', '16s')),
  marketing_opt_in boolean not null default true,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260818090000_profile_onboarding_fields.sql supabase/schema.sql
git commit -m "Add onboarding fields (role, league, age_group, marketing_opt_in) to profiles"
```

---

### Task 2: Dedicated `/sign-in` page

**Files:**
- Create: `src/pages/SignInPage.jsx`
- Modify: `src/App.jsx` (add route)
- Modify: `src/components/Layout.jsx:27-31` (header link target)
- Modify: `src/index.css` (append sign-in page styles)

**Interfaces:**
- Consumes: `useAuth()` from `src/context/AuthContext.jsx` — `{ user, signInWithGoogle, signInWithEmail }` (existing, unchanged).
- Produces: route `path="sign-in"` rendering `SignInPage`, importable as `const SignInPage = lazy(() => import('./pages/SignInPage'))` alongside the other lazy routes.

- [ ] **Step 1: Write `SignInPage`**

```jsx
// src/pages/SignInPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'

export default function SignInPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  useEffect(() => {
    if (auth?.user) navigate('/', { replace: true })
  }, [auth?.user, navigate])

  async function handleEmailSignIn(e) {
    e.preventDefault()
    if (!email) return
    await auth?.signInWithEmail(email)
    setMagicLinkSent(true)
  }

  return (
    <section className="sign-in-page">
      <h1>Sign In</h1>
      <p className="section-subtitle">Save your predictions, appear on the leaderboard, and get an app built around your team.</p>

      <div className="sign-in-page__body">
        <button className="button" onClick={auth?.signInWithGoogle}>Continue with Google</button>

        <form onSubmit={handleEmailSignIn} className="auth-email-form">
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="button button--secondary" type="submit">Email me a sign-in link</button>
        </form>

        {magicLinkSent && <p className="auth-note">Check your inbox for the sign-in link.</p>}
        {!isSupabaseConfigured && <p className="auth-note">Supabase isn't connected yet, this is a preview of the sign-in flow.</p>}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add the CSS**

Append to `src/index.css`:

```css
.sign-in-page {
  max-width: 420px;
  margin: 2rem auto 0;
}

.sign-in-page__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
}

.sign-in-page__body .button {
  min-height: 44px;
}
```

- [ ] **Step 3: Add the route in `src/App.jsx`**

```jsx
const SignInPage = lazy(() => import('./pages/SignInPage'))
```

Add alongside the other `lazy(...)` declarations, then add the route inside `<Route element={<Layout />}>`:

```jsx
<Route path="sign-in" element={<SignInPage />} />
```

- [ ] **Step 4: Point the header's "Sign In" link at the new route**

In `src/components/Layout.jsx`, change:

```jsx
) : !PREDICTIONS_COMING_SOON ? (
  <NavLink to="/predictions" className="link-button">Sign in</NavLink>
) : null}
```

to:

```jsx
) : !PREDICTIONS_COMING_SOON ? (
  <NavLink to="/sign-in" className="link-button">Sign in</NavLink>
) : null}
```

- [ ] **Step 5: Build and manually verify**

Run: `npm run build`
Expected: builds with no errors, and a new `SignInPage-*.js` chunk appears in the output alongside the other lazy-loaded pages.

Run: `npm run dev`, open the app, click "Sign in" in the header.
Expected: navigates to `/sign-in`, the Google button is visible without scrolling, clicking "Continue with Google" starts the OAuth flow (or, if Supabase isn't configured locally, shows the "Supabase isn't connected yet" note instead of crashing).

- [ ] **Step 6: Commit**

```bash
git add src/pages/SignInPage.jsx src/App.jsx src/components/Layout.jsx src/index.css
git commit -m "Add a dedicated /sign-in page, point the header link at it"
```

---

### Task 3: `OnboardingFlow` step wizard

**Files:**
- Create: `src/components/OnboardingFlow.jsx`
- Modify: `src/index.css` (append onboarding styles)

**Interfaces:**
- Consumes: `supabase`, `isSupabaseConfigured` from `src/lib/supabaseClient.js`; `placeholderStandings` from `src/lib/placeholderData.js` (fallback team/league list when Supabase isn't configured).
- Produces: `export default function OnboardingFlow({ userId, onComplete })` where `onComplete(profileRow)` is called with the upserted `profiles` row once the user finishes. This is the exact signature `OnboardingGate` (Task 4) renders and consumes.

- [ ] **Step 1: Write `OnboardingFlow`**

```jsx
// src/components/OnboardingFlow.jsx
import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { placeholderStandings } from '../lib/placeholderData'

const AGE_GROUPS = [
  { value: 'first_grade', label: 'First Grade' },
  { value: '20s', label: '20s' },
  { value: '18s', label: '18s' },
  { value: '16s', label: '16s' },
]

function OptionButton({ selected, onClick, children }) {
  return (
    <button
      type="button"
      className={`onboarding__option${selected ? ' onboarding__option--selected' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default function OnboardingFlow({ userId, onComplete }) {
  const [step, setStep] = useState(0)
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState(null)
  const [league, setLeague] = useState(null)
  const [leagueOther, setLeagueOther] = useState('')
  const [team, setTeam] = useState('')
  const [ageGroup, setAgeGroup] = useState(null)
  const [marketingOptIn, setMarketingOptIn] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [standingsRows, setStandingsRows] = useState(placeholderStandings)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase
      .from('standings')
      .select('competition, team')
      .order('competition', { ascending: true })
      .order('team', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (!fetchError && data?.length) setStandingsRows(data)
      })
  }, [])

  const leagues = [...new Set(standingsRows.map((row) => row.competition))]
  const effectiveLeague = league === 'other' ? null : league
  const teamsInLeague = effectiveLeague
    ? standingsRows.filter((row) => row.competition === effectiveLeague).map((row) => row.team)
    : []

  function nextStep() {
    setError('')
    setStep((s) => s + 1)
  }

  function handleNameSubmit(e) {
    e.preventDefault()
    if (!displayName.trim()) {
      setError('Enter a name for the leaderboard.')
      return
    }
    nextStep()
  }

  function handleRoleSelect(value) {
    setRole(value)
    setStep(value === 'fan' ? 2 : 2) // both paths go to step 2 next; step content branches on role
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError('')

    const resolvedLeague = role === 'fan' ? null : (league === 'other' ? leagueOther.trim() : league)
    const resolvedTeam = team.trim()

    if (!resolvedTeam) {
      setError('Pick or enter a team.')
      setSubmitting(false)
      return
    }

    const { data, error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        display_name: displayName.trim(),
        role,
        league: resolvedLeague,
        followed_team: resolvedTeam,
        age_group: role === 'fan' ? null : ageGroup,
        marketing_opt_in: marketingOptIn,
      })
      .select()
      .single()

    setSubmitting(false)

    if (upsertError) {
      setError('Could not save your profile, try again.')
      return
    }

    onComplete(data)
  }

  return (
    <section className="onboarding">
      {step === 0 && (
        <div className="onboarding__step">
          <h1 className="onboarding__title">Who's picking?</h1>
          <form onSubmit={handleNameSubmit} className="onboarding__form">
            <input
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={30}
              autoFocus
            />
            <button type="submit" className="button">Next</button>
          </form>
        </div>
      )}

      {step === 1 && (
        <div className="onboarding__step">
          <h1 className="onboarding__title">Are you a...</h1>
          <div className="onboarding__options">
            <OptionButton selected={role === 'player'} onClick={() => handleRoleSelect('player')}>Player</OptionButton>
            <OptionButton selected={role === 'coach'} onClick={() => handleRoleSelect('coach')}>Coach</OptionButton>
            <OptionButton selected={role === 'fan'} onClick={() => handleRoleSelect('fan')}>Fan</OptionButton>
          </div>
        </div>
      )}

      {step === 2 && role !== 'fan' && (
        <div className="onboarding__step">
          <h1 className="onboarding__title">Which league?</h1>
          <div className="onboarding__options">
            {leagues.map((name) => (
              <OptionButton key={name} selected={league === name} onClick={() => { setLeague(name); setTeam('') }}>{name}</OptionButton>
            ))}
            <OptionButton selected={league === 'other'} onClick={() => { setLeague('other'); setTeam('') }}>Other</OptionButton>
          </div>
          {league === 'other' && (
            <input
              type="text"
              placeholder="Your league"
              value={leagueOther}
              onChange={(e) => setLeagueOther(e.target.value)}
              className="onboarding__text-input"
            />
          )}
          <button type="button" className="button" disabled={!league} onClick={nextStep}>Next</button>
        </div>
      )}

      {step === 2 && role === 'fan' && (
        <div className="onboarding__step">
          <h1 className="onboarding__title">Which team do you follow?</h1>
          <select className="onboarding__select" value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="">Choose a team</option>
            {leagues.map((name) => (
              <optgroup key={name} label={name}>
                {standingsRows.filter((row) => row.competition === name).map((row) => (
                  <option key={row.team} value={row.team}>{row.team}</option>
                ))}
              </optgroup>
            ))}
          </select>
          {error && <p className="auth-note auth-note--error">{error}</p>}
          <button type="button" className="button" disabled={!team} onClick={() => { setError(''); nextStep() }}>Next</button>
        </div>
      )}

      {step === 3 && role !== 'fan' && (
        <div className="onboarding__step">
          <h1 className="onboarding__title">Which team?</h1>
          {league === 'other' ? (
            <input
              type="text"
              placeholder="Your team"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="onboarding__text-input"
            />
          ) : (
            <select className="onboarding__select" value={team} onChange={(e) => setTeam(e.target.value)}>
              <option value="">Choose a team</option>
              {teamsInLeague.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}
          <button type="button" className="button" disabled={!team.trim()} onClick={nextStep}>Next</button>
        </div>
      )}

      {step === 3 && role === 'fan' && (
        <div className="onboarding__step">
          <h1 className="onboarding__title">Keep you posted?</h1>
          <label className="onboarding__checkbox">
            <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} />
            Keep me posted about new episodes and features
          </label>
          {error && <p className="auth-note auth-note--error">{error}</p>}
          <button type="button" className="button" disabled={submitting} onClick={handleSubmit}>
            {submitting ? 'Saving...' : 'Done'}
          </button>
        </div>
      )}

      {step === 4 && role !== 'fan' && (
        <div className="onboarding__step">
          <h1 className="onboarding__title">Age group?</h1>
          <div className="onboarding__options">
            {AGE_GROUPS.map(({ value, label }) => (
              <OptionButton key={value} selected={ageGroup === value} onClick={() => setAgeGroup(value)}>{label}</OptionButton>
            ))}
          </div>
          <button type="button" className="button" disabled={!ageGroup} onClick={nextStep}>Next</button>
        </div>
      )}

      {step === 5 && role !== 'fan' && (
        <div className="onboarding__step">
          <h1 className="onboarding__title">Keep you posted?</h1>
          <label className="onboarding__checkbox">
            <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} />
            Keep me posted about new episodes and features
          </label>
          {error && <p className="auth-note auth-note--error">{error}</p>}
          <button type="button" className="button" disabled={submitting} onClick={handleSubmit}>
            {submitting ? 'Saving...' : 'Done'}
          </button>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Add the CSS**

Append to `src/index.css`:

```css
.onboarding {
  max-width: 420px;
  margin: 3rem auto 0;
  padding: 0 1rem;
}

.onboarding__title {
  margin-bottom: 1.5rem;
}

.onboarding__step {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.onboarding__form {
  display: flex;
  gap: 0.5rem;
}

.onboarding__form input,
.onboarding__text-input,
.onboarding__select {
  min-height: 44px;
  font-family: var(--font-body);
  background: var(--surface-alt);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0 0.75rem;
  width: 100%;
}

.onboarding__options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.onboarding__option {
  min-height: 44px;
  text-align: left;
  padding: 0 1rem;
  background: none;
  border: 1px solid var(--border);
  color: var(--text);
  font-family: var(--font-body);
  font-size: 1rem;
  cursor: pointer;
}

.onboarding__option--selected {
  border-color: var(--accent);
  color: var(--accent);
}

.onboarding__checkbox {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--text-dim);
  font-size: 0.9rem;
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: builds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/OnboardingFlow.jsx src/index.css
git commit -m "Add OnboardingFlow: first-sign-in step wizard for role/league/team/age-group"
```

---

### Task 4: `OnboardingGate`, wired into `Layout`

**Files:**
- Create: `src/components/OnboardingGate.jsx`
- Modify: `src/components/Layout.jsx`

**Interfaces:**
- Consumes: `useAuth()` (`{ user }`), `useMyProfile(userId)` from `src/hooks/useMyProfile.js` (`{ profile, setProfile, checked }`, unchanged, existing hook), `OnboardingFlow` from Task 3 (`{ userId, onComplete }`).
- Produces: `export default function OnboardingGate({ children })` — renders `children` (the app's normal routed content) once onboarding is either not needed or complete; renders `OnboardingFlow` otherwise.

- [ ] **Step 1: Write `OnboardingGate`**

```jsx
// src/components/OnboardingGate.jsx
import { useAuth } from '../context/AuthContext'
import useMyProfile from '../hooks/useMyProfile'
import OnboardingFlow from './OnboardingFlow'

// Fires the first time a signed-in user has no profiles row yet, no matter
// which tab they land on after Google sign-in — replaces the old inline
// "pick a display name" card that only ever showed up on Predictions.
export default function OnboardingGate({ children }) {
  const auth = useAuth()
  const { profile, setProfile, checked } = useMyProfile(auth?.user?.id)

  const needsOnboarding = Boolean(auth?.user) && checked && !profile

  if (needsOnboarding) {
    return <OnboardingFlow userId={auth.user.id} onComplete={(row) => setProfile(row)} />
  }

  return children
}
```

- [ ] **Step 2: Wrap `<Outlet />` in `Layout`**

In `src/components/Layout.jsx`, add the import:

```jsx
import OnboardingGate from './OnboardingGate'
```

Change:

```jsx
      <main className="app-main">
        <Outlet />
      </main>
```

to:

```jsx
      <main className="app-main">
        <OnboardingGate>
          <Outlet />
        </OnboardingGate>
      </main>
```

- [ ] **Step 3: Build and manually verify**

Run: `npm run build`
Expected: builds with no errors.

Run: `npm run dev`. With Supabase configured against a test project: sign in with a Google account that has no `profiles` row, land on any tab (try Home, Podcast, News — not just Predictions).
Expected: the onboarding wizard appears immediately regardless of tab, walks through name → role → (league → team → age group, or team-only for fan) → opt-in, and on submit the wizard disappears and the requested page renders normally. Refreshing the page or navigating to a different tab afterward does not re-trigger onboarding.

Run: with `isSupabaseConfigured` false (no `.env` Supabase vars) or signed out.
Expected: no crash, app renders normally with no onboarding gate active (since `auth?.user` is falsy).

- [ ] **Step 4: Commit**

```bash
git add src/components/OnboardingGate.jsx src/components/Layout.jsx
git commit -m "Gate the whole app behind onboarding for first-time signed-in users"
```

---

### Task 5: Remove the old inline onboarding block from `PredictionsPage`

**Files:**
- Modify: `src/pages/PredictionsPage.jsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — this task only deletes now-dead code. `PredictionsPage` still calls `useMyProfile(auth?.user?.id)` for `profile.last_rank` (used by `PredictionsDashboard`'s `previousRank` prop) — that stays, only the display-name-capture UI and its state go.

- [ ] **Step 1: Remove the dead state and handler**

In `src/pages/PredictionsPage.jsx`, remove these lines (around 43-44):

```jsx
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [displayNameError, setDisplayNameError] = useState('')
```

Remove the `saveDisplayName` function (around lines 109-125):

```jsx
  async function saveDisplayName(e) {
    e.preventDefault()
    if (!displayNameInput.trim() || !auth?.user) return

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: auth.user.id, display_name: displayNameInput.trim() })
      .select()
      .single()

    if (!error) {
      setProfile(data)
      setDisplayNameError('')
    } else {
      setDisplayNameError('Could not save your name, try again.')
    }
  }
```

Remove the `needsDisplayName` derived value (around line 232):

```jsx
  const needsDisplayName = auth?.user && profileChecked && !profile
```

- [ ] **Step 2: Remove the inline "pick a name" card from the JSX**

Remove this block (around lines 267-282):

```jsx
      {needsDisplayName && (
        <div className="auth-card">
          <p>Pick a name for the leaderboard.</p>
          <form onSubmit={saveDisplayName} className="auth-email-form">
            <input
              type="text"
              placeholder="Your name"
              value={displayNameInput}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              maxLength={30}
            />
            <button type="submit">Save</button>
          </form>
          {displayNameError && <p className="auth-note auth-note--error">{displayNameError}</p>}
        </div>
      )}
```

- [ ] **Step 3: Check `useMyProfile` destructuring still matches usage**

`const { profile, setProfile, checked: profileChecked } = useMyProfile(auth?.user?.id)` at line 42 — confirm `setProfile` is still used elsewhere in the file (search for other `setProfile(` calls). If it's now unused after Step 1's removal, change the destructure to `const { profile, checked: profileChecked } = useMyProfile(auth?.user?.id)` to avoid an unused-variable warning. `profileChecked` and `profile` themselves stay in use (`profile?.last_rank`, and this page's own `<PredictionsDashboard previousRank={profile?.last_rank ?? null} />` call).

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: builds with no errors, no unused-variable warnings from `oxlint` (`npm run lint`).

- [ ] **Step 5: Manually verify Predictions page still works for a fully-onboarded user**

Run: `npm run dev`, sign in as a user who already has a `profiles` row (completed onboarding, or set one manually in Supabase for a test user), visit `/predictions`.
Expected: no "pick a name" card appears (there's nothing left to prompt for), the rest of the page (countdown, The Eight picks, leaderboard) behaves exactly as before this plan.

- [ ] **Step 6: Commit**

```bash
git add src/pages/PredictionsPage.jsx
git commit -m "Remove inline display-name prompt from Predictions, now handled by OnboardingGate"
```

---

### Task 6: End-to-end manual QA pass

**Files:** none (verification only)

**Interfaces:** none.

- [ ] **Step 1: Fresh sign-in end to end**

Using a Supabase project with the Task 1 migration applied: delete (or use a Google account without) a `profiles` row, sign in via `/sign-in`, confirm you land in `OnboardingFlow` immediately, complete the Player path (name → role=Player → league → team → age group → opt-in → Done), confirm you land back wherever you started with the onboarding gate gone.

- [ ] **Step 2: Fan path**

Repeat with a fresh account choosing Fan — confirm no league or age-group step appears, just name → role → team → opt-in.

- [ ] **Step 3: Personalization payoff**

After completing onboarding with a real `followed_team` value that matches a team in `standings`, visit Home and confirm `MyTeamDashboard` now reflects that team (it already reads `profiles.followed_team` — this is a smoke test that the new write path feeds the existing read path correctly, not a new feature).

- [ ] **Step 4: Re-visit does not re-trigger onboarding**

Reload the app, navigate across all tabs (Home, Predictions, Podcast, News), confirm `OnboardingFlow` never reappears for the now-onboarded account.

- [ ] **Step 5: Supabase-unconfigured fallback**

Temporarily unset `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (or run against a checkout with no `.env.local`), run `npm run dev`, confirm the app loads without crashing and no onboarding gate fires (since there's no real auth session).

- [ ] **Step 6: Note any findings**

If any step fails, fix the underlying task before considering this plan complete — do not commit a "known issue" workaround without flagging it back for a decision.
