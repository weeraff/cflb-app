import { useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { placeholderFixtures, placeholderLeaderboard } from '../lib/placeholderData'
import { PREDICTIONS_COMING_SOON } from '../lib/featureFlags'
import TeamCrest from '../components/TeamCrest'
import Leagues from '../components/Leagues'
import CompetitionReference from '../components/CompetitionReference'
import ChampagneNineWizard, { buildChampagneNineFixtures } from '../components/ChampagneNineWizard'
import ChampagneNineSummary, { pickResult } from '../components/ChampagneNineSummary'
import useCompetitionData from '../hooks/useCompetitionData'

export default function PredictionsPage() {
  if (PREDICTIONS_COMING_SOON) {
    return (
      <section>
        <h1>Predictions</h1>
        <div className="coming-soon">
          <span className="coming-soon__badge">Coming soon</span>
          <p>Pick the scoreline for each fixture, climb the leaderboard. Launching once the season's fixtures are locked in.</p>
        </div>
      </section>
    )
  }

  return <PredictionsPageContent />
}

function PredictionsPageContent() {
  const auth = useAuth()
  const [fixtures, setFixtures] = useState(placeholderFixtures)
  const [myPredictions, setMyPredictions] = useState({})
  const [leaderboard, setLeaderboard] = useState(placeholderLeaderboard)
  const [picks, setPicks] = useState({})
  const [email, setEmail] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [profile, setProfile] = useState(null)
  const [profileChecked, setProfileChecked] = useState(false)
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [displayNameError, setDisplayNameError] = useState('')
  const [submitNotice, setSubmitNotice] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [editStep, setEditStep] = useState(null)
  const [resultStats, setResultStats] = useState({})

  const { standings, results } = useCompetitionData()

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase
      .from('fixtures')
      .select('*')
      .eq('featured', true)
      .order('kickoff_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setFixtures(data)
      })

    refreshLeaderboard()
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || !auth?.user) {
      setProfile(null)
      setProfileChecked(true)
      return
    }

    supabase
      .from('profiles')
      .select('*')
      .eq('id', auth.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data)
        setProfileChecked(true)
      })

    supabase
      .from('predictions')
      .select('*')
      .eq('user_id', auth.user.id)
      .then(({ data, error }) => {
        if (!error && data) {
          const byFixture = {}
          for (const p of data) byFixture[p.fixture_id] = p
          setMyPredictions(byFixture)
        }
      })
  }, [auth?.user])

  useEffect(() => {
    if (!isSupabaseConfigured || !submittedAll) return

    supabase
      .from('fixture_result_stats')
      .select('*')
      .in('fixture_id', champagneNine.map((f) => f.id))
      .then(({ data, error }) => {
        if (error || !data) return

        const totalsByFixture = {}
        for (const row of data) {
          totalsByFixture[row.fixture_id] ??= { total: 0, byResult: {} }
          totalsByFixture[row.fixture_id].total += row.pick_count
          totalsByFixture[row.fixture_id].byResult[row.predicted_result] = row.pick_count
        }

        const stats = {}
        for (const fixture of champagneNine) {
          const pick = myPredictions[fixture.id]
          if (!pick) continue
          const result = pickResult(pick.home_score_pick, pick.away_score_pick)
          const entry = totalsByFixture[fixture.id]
          if (!entry || entry.total === 0) continue
          stats[fixture.id] = Math.round(((entry.byResult[result] ?? 0) / entry.total) * 100)
        }
        setResultStats(stats)
      })
  }, [submittedAll, myPredictions])

  function refreshLeaderboard() {
    supabase
      .from('leaderboard')
      .select('*')
      .order('points', { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (!error && data?.length) setLeaderboard(data)
      })
  }

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

  function updatePick(fixtureId, field, value) {
    setPicks((prev) => ({
      ...prev,
      [fixtureId]: { ...prev[fixtureId], [field]: value },
    }))
  }

  async function submitAllPicks() {
    if (!isSupabaseConfigured || !auth?.user) {
      setSubmitNotice({ type: 'info', text: 'Sign in above to submit your predictions.' })
      return
    }
    if (champagneNine.length === 0) return

    setSubmitting(true)
    const rows = champagneNine.map((fixture) => ({
      user_id: auth.user.id,
      fixture_id: fixture.id,
      home_score_pick: picks[fixture.id]?.home ?? myPredictions[fixture.id]?.home_score_pick ?? 0,
      away_score_pick: picks[fixture.id]?.away ?? myPredictions[fixture.id]?.away_score_pick ?? 0,
    }))

    const { data, error } = await supabase
      .from('predictions')
      .upsert(rows, { onConflict: 'user_id,fixture_id' })
      .select()

    setSubmitting(false)
    if (!error) {
      const byFixture = { ...myPredictions }
      for (const row of data) byFixture[row.fixture_id] = row
      setMyPredictions(byFixture)
      setSubmitNotice({ type: 'success', text: 'Champagne Nine submitted.' })
      setReviewing(false)
    } else {
      setSubmitNotice({ type: 'error', text: 'Could not submit your predictions, try again.' })
    }
  }

  async function handleEmailSignIn(e) {
    e.preventDefault()
    if (!email) return
    await auth?.signInWithEmail(email)
    setMagicLinkSent(true)
  }

  const upcoming = fixtures.filter((f) => f.status === 'scheduled')
  const champagneNine = useMemo(() => buildChampagneNineFixtures(upcoming), [upcoming])
  const submittedAll = champagneNine.length > 0 && champagneNine.every((f) => myPredictions[f.id])
  const awaitingResult = fixtures.filter((f) => f.status === 'locked')
  const recentlyDecided = fixtures
    .filter((f) => f.status === 'completed')
    .sort((a, b) => new Date(b.kickoff_at) - new Date(a.kickoff_at))
    .slice(0, 5)

  const needsDisplayName = auth?.user && profileChecked && !profile

  return (
    <section>
      <h1>Predictions</h1>
      <p className="section-subtitle">Champagne Nine: 9 fixtures each week, 4 NPL NSW, 3 League One, 2 League Two. Pick the scoreline before kickoff, 3 points for an exact score, 1 for the right result.</p>

      {!auth?.user && (
        <div className="auth-card">
          <p>Sign in to save your predictions and appear on the leaderboard.</p>
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
      )}

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
            <button className="button" type="submit">Save</button>
          </form>
          {displayNameError && <p className="auth-note auth-note--error">{displayNameError}</p>}
        </div>
      )}

      <details className="reference-panel">
        <summary className="reference-panel__toggle">Check the table, results &amp; form before you pick</summary>
        <CompetitionReference heading={null} />
      </details>

      <h2>Champagne Nine</h2>

      {champagneNine.length === 0 && <p className="auth-note">No fixtures open for picks right now.</p>}

      {champagneNine.length > 0 && submittedAll && (
        <ChampagneNineSummary
          fixtures={champagneNine}
          picks={Object.fromEntries(
            champagneNine.map((f) => [
              f.id,
              { home: myPredictions[f.id]?.home_score_pick ?? 0, away: myPredictions[f.id]?.away_score_pick ?? 0 },
            ]),
          )}
          locked
          resultStats={resultStats}
        />
      )}

      {champagneNine.length > 0 && !submittedAll && reviewing && (
        <ChampagneNineSummary
          fixtures={champagneNine}
          picks={Object.fromEntries(
            champagneNine.map((f) => [
              f.id,
              { home: picks[f.id]?.home ?? myPredictions[f.id]?.home_score_pick ?? 0, away: picks[f.id]?.away ?? myPredictions[f.id]?.away_score_pick ?? 0 },
            ]),
          )}
          onEdit={(fixtureId) => {
            setEditStep(champagneNine.findIndex((f) => f.id === fixtureId))
            setReviewing(false)
          }}
          onSubmit={submitAllPicks}
          submitting={submitting}
        />
      )}

      {champagneNine.length > 0 && !submittedAll && !reviewing && (
        <ChampagneNineWizard
          key={editStep ?? 'wizard'}
          fixtures={champagneNine}
          picks={picks}
          updatePick={updatePick}
          standings={standings}
          results={results}
          initialStep={editStep ?? 0}
          initialCompletedCount={editStep != null ? champagneNine.length - 1 : 0}
          onComplete={() => {
            setEditStep(null)
            setReviewing(true)
          }}
        />
      )}

      {submitNotice && (
        <p className={`form-notice form-notice--${submitNotice.type}`}>{submitNotice.text}</p>
      )}

      {awaitingResult.length > 0 && (
        <>
          <h2>Awaiting Result</h2>
          <ul className="results-list">
            {awaitingResult.map((fixture) => {
              const pick = myPredictions[fixture.id]
              return (
                <li key={fixture.id} className="result-row">
                  <span className="result-row__round">{fixture.competition}</span>
                  <span className="result-row__match">
                    <span className="result-row__team">
                      <TeamCrest src={fixture.home_logo} name={fixture.home_team} />
                      <span className="result-row__team-name">{fixture.home_team}</span>
                    </span>
                    <span className="result-row__score">v</span>
                    <span className="result-row__team">
                      <TeamCrest src={fixture.away_logo} name={fixture.away_team} />
                      <span className="result-row__team-name">{fixture.away_team}</span>
                    </span>
                  </span>
                  <span className="result-row__ground">
                    {pick ? `Your pick: ${pick.home_score_pick}-${pick.away_score_pick}` : 'No pick made'}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {recentlyDecided.length > 0 && (
        <>
          <h2>Recently Decided</h2>
          <ul className="results-list">
            {recentlyDecided.map((fixture) => {
              const pick = myPredictions[fixture.id]
              return (
                <li key={fixture.id} className="result-row">
                  <span className="result-row__round">{fixture.competition}</span>
                  <span className="result-row__match">
                    <span className="result-row__team">
                      <TeamCrest src={fixture.home_logo} name={fixture.home_team} />
                      <span className="result-row__team-name">{fixture.home_team}</span>
                    </span>
                    <span className="result-row__score">{fixture.home_score} - {fixture.away_score}</span>
                    <span className="result-row__team">
                      <TeamCrest src={fixture.away_logo} name={fixture.away_team} />
                      <span className="result-row__team-name">{fixture.away_team}</span>
                    </span>
                  </span>
                  {pick && (
                    <span className="result-row__ground">
                      You picked {pick.home_score_pick}-{pick.away_score_pick}
                      {pick.points_awarded != null ? ` (+${pick.points_awarded})` : ' (scoring soon)'}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}

      <Leagues />

      <h2>Leaderboard</h2>
      {leaderboard.some((entry) => entry.points > 0) ? (
        <ol className="leaderboard">
          {leaderboard.map((entry, i) => (
            <li key={entry.user_id ?? entry.display_name}>
              <span className="leaderboard__rank">{i + 1}</span>
              <span className="leaderboard__name">{entry.display_name}</span>
              <span className="leaderboard__points">{entry.points} pts</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="auth-note">Be the first on the board — make your picks before kickoff.</p>
      )}
    </section>
  )
}
