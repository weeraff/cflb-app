import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { placeholderFixtures, placeholderLeaderboard } from '../lib/placeholderData'
import { PREDICTIONS_COMING_SOON } from '../lib/featureFlags'
import FixtureTeamRow from '../components/FixtureTeamRow'
import Leagues from '../components/Leagues'
import CompactFormGuide from '../components/CompactFormGuide'
import SponsorModule from '../components/SponsorModule'
import PredictionsDashboard from '../components/PredictionsDashboard'
import TheEightWizard from '../components/TheEightWizard'
import TheEightSummary, { pickResult } from '../components/TheEightSummary'
import { buildTheEightFixtures, computeRoundKey, computeLockTime } from '../lib/theEight'
import useCompetitionData from '../hooks/useCompetitionData'
import useMyProfile from '../hooks/useMyProfile'

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
  const { profile } = useMyProfile(auth?.user?.id)
  const [submitNotice, setSubmitNotice] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [editStep, setEditStep] = useState(null)
  const [resultStats, setResultStats] = useState({})
  const [tiebreakerPick, setTiebreakerPick] = useState(null)
  const [savedTiebreakers, setSavedTiebreakers] = useState({})

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
    if (!isSupabaseConfigured || !auth?.user) return

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

    supabase
      .from('tiebreaker_predictions')
      .select('*')
      .eq('user_id', auth.user.id)
      .then(({ data, error }) => {
        if (!error && data) {
          const byRound = {}
          for (const t of data) byRound[t.round_key] = t.minute_pick
          setSavedTiebreakers(byRound)
        }
      })
  }, [auth?.user])

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
    if (theEight.length === 0) return

    setSubmitting(true)
    const rows = theEight.map((fixture) => ({
      user_id: auth.user.id,
      fixture_id: fixture.id,
      home_score_pick: picks[fixture.id]?.home ?? myPredictions[fixture.id]?.home_score_pick ?? 0,
      away_score_pick: picks[fixture.id]?.away ?? myPredictions[fixture.id]?.away_score_pick ?? 0,
    }))

    const { data, error } = await supabase
      .from('predictions')
      .upsert(rows, { onConflict: 'user_id,fixture_id' })
      .select()

    if (!error && roundKey) {
      await supabase.from('tiebreaker_predictions').upsert(
        {
          user_id: auth.user.id,
          round_key: roundKey,
          minute_pick: tiebreakerPick ?? savedTiebreakers[roundKey] ?? 0,
        },
        { onConflict: 'user_id,round_key' },
      )
    }

    setSubmitting(false)
    if (!error) {
      const byFixture = { ...myPredictions }
      for (const row of data) byFixture[row.fixture_id] = row
      setMyPredictions(byFixture)
      if (roundKey) {
        setSavedTiebreakers((prev) => ({ ...prev, [roundKey]: tiebreakerPick ?? prev[roundKey] ?? 0 }))
      }
      setSubmitNotice({ type: 'success', text: 'The Eight submitted.' })
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
  const theEight = useMemo(() => buildTheEightFixtures(upcoming), [upcoming])
  const roundKey = useMemo(() => computeRoundKey(theEight), [theEight])
  const lockTime = useMemo(() => computeLockTime(theEight), [theEight])
  const submittedAll = theEight.length > 0 && theEight.every((f) => myPredictions[f.id])

  const sortedLeaderboard = [...leaderboard].sort((a, b) => b.points - a.points)
  const myLeaderboardIndex = auth?.user ? sortedLeaderboard.findIndex((entry) => entry.user_id === auth.user.id) : -1
  const myRank = myLeaderboardIndex >= 0 ? myLeaderboardIndex + 1 : null

  useEffect(() => {
    if (!isSupabaseConfigured || !submittedAll) return

    supabase
      .from('fixture_result_stats')
      .select('*')
      .in('fixture_id', theEight.map((f) => f.id))
      .then(({ data, error }) => {
        if (error || !data) return

        const totalsByFixture = {}
        for (const row of data) {
          totalsByFixture[row.fixture_id] ??= { total: 0, byResult: {} }
          totalsByFixture[row.fixture_id].total += row.pick_count
          totalsByFixture[row.fixture_id].byResult[row.predicted_result] = row.pick_count
        }

        const stats = {}
        for (const fixture of theEight) {
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
  const awaitingResult = fixtures.filter((f) => f.status === 'locked')
  const recentlyDecided = fixtures
    .filter((f) => f.status === 'completed')
    .sort((a, b) => new Date(b.kickoff_at) - new Date(a.kickoff_at))
    .slice(0, 5)

  return (
    <section>
      <h1>Predictions</h1>
      <p className="section-subtitle">The Eight: 8 fixtures each week, 4 NPL NSW, 3 League One, 1 League Two. Pick the scoreline before kickoff, 3 points for an exact score, 1 for the right result.</p>

      <PredictionsDashboard
        userId={auth?.user?.id ?? null}
        lockTime={lockTime}
        submittedAll={submittedAll}
        hasFixtures={theEight.length > 0}
        rank={myRank}
        previousRank={profile?.last_rank ?? null}
        onCta={() => document.getElementById('the-eight-picks')?.scrollIntoView({ behavior: 'smooth' })}
      />

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

      <details className="reference-panel">
        <summary className="reference-panel__toggle">Check form before you pick</summary>
        <CompactFormGuide fixtures={theEight} standings={standings} results={results} />
        <Link className="reference-panel__full-link" to="/">See the full table, results &amp; top scorers →</Link>
      </details>

      <h2 id="the-eight-picks">The Eight</h2>

      <SponsorModule slot="predictions_top" rotateKey={roundKey ?? ''} />

      {theEight.length === 0 && <p className="auth-note">No fixtures open for picks right now.</p>}

      {theEight.length > 0 && submittedAll && (
        <TheEightSummary
          fixtures={theEight}
          picks={Object.fromEntries(
            theEight.map((f) => [
              f.id,
              { home: myPredictions[f.id]?.home_score_pick ?? 0, away: myPredictions[f.id]?.away_score_pick ?? 0 },
            ]),
          )}
          locked
          resultStats={resultStats}
          tiebreaker={savedTiebreakers[roundKey]}
          roundKey={roundKey ?? ''}
        />
      )}

      {theEight.length > 0 && !submittedAll && reviewing && (
        <TheEightSummary
          fixtures={theEight}
          picks={Object.fromEntries(
            theEight.map((f) => [
              f.id,
              { home: picks[f.id]?.home ?? myPredictions[f.id]?.home_score_pick ?? 0, away: picks[f.id]?.away ?? myPredictions[f.id]?.away_score_pick ?? 0 },
            ]),
          )}
          onEdit={(fixtureId) => {
            setEditStep(theEight.findIndex((f) => f.id === fixtureId))
            setReviewing(false)
          }}
          onSubmit={submitAllPicks}
          submitting={submitting}
          tiebreaker={tiebreakerPick ?? savedTiebreakers[roundKey] ?? 0}
          onTiebreakerChange={setTiebreakerPick}
        />
      )}

      {theEight.length > 0 && !submittedAll && !reviewing && (
        <TheEightWizard
          key={editStep ?? 'wizard'}
          fixtures={theEight}
          picks={picks}
          updatePick={updatePick}
          standings={standings}
          results={results}
          initialStep={editStep ?? 0}
          initialCompletedCount={editStep != null ? theEight.length - 1 : 0}
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
                    <FixtureTeamRow
                      className="result-row__team"
                      nameClassName="result-row__team-name"
                      logo={fixture.home_logo}
                      name={fixture.home_team}
                    />
                    <span className="result-row__score">v</span>
                    <FixtureTeamRow
                      className="result-row__team"
                      nameClassName="result-row__team-name"
                      logo={fixture.away_logo}
                      name={fixture.away_team}
                    />
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
                    <FixtureTeamRow
                      className="result-row__team"
                      nameClassName="result-row__team-name"
                      logo={fixture.home_logo}
                      name={fixture.home_team}
                    />
                    <span className="result-row__score">{fixture.home_score} - {fixture.away_score}</span>
                    <FixtureTeamRow
                      className="result-row__team"
                      nameClassName="result-row__team-name"
                      logo={fixture.away_logo}
                      name={fixture.away_team}
                    />
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
