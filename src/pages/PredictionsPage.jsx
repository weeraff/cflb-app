import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { placeholderFixtures, placeholderLeaderboard } from '../lib/placeholderData'
import { PREDICTIONS_COMING_SOON, SPONSORS_ENABLED } from '../lib/featureFlags'
import Leagues from '../components/Leagues'
import EmailPasswordAuth from '../components/EmailPasswordAuth'
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
  const { profile } = useMyProfile(auth?.user?.id)
  const [submitNotice, setSubmitNotice] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [editStep, setEditStep] = useState(null)
  const [resultStats, setResultStats] = useState({})
  const [lastWeek, setLastWeek] = useState([])

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

    // Last week: every scored pick belonging to the most recent round the
    // user actually has decided predictions for — not just "the last 8 by
    // kickoff date", which silently spills into an older round (and mixes
    // its fixtures in) whenever a round wasn't fully picked. fixtures.round
    // is shared across all three tiers for a given curated round (NPL NSW/
    // League One/League Two all say "Round 30" together), so matching the
    // most recent prediction's round string groups the whole round
    // correctly without needing a round_key column on this table.
    supabase
      .from('predictions')
      .select('*, fixtures(*)')
      .eq('user_id', auth.user.id)
      .not('points_awarded', 'is', null)
      .order('kickoff_at', { foreignTable: 'fixtures', ascending: false })
      .then(({ data, error }) => {
        if (error || !data?.length) {
          setLastWeek([])
          return
        }
        const latestRound = data[0].fixtures?.round
        setLastWeek(data.filter((p) => p.fixtures?.round === latestRound))
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

  // Only one Joker per round: setting one clears it everywhere else in
  // this round's fixtures. Toggling the same fixture again unsets it.
  function setJoker(fixtureId) {
    setPicks((prev) => {
      const currentlyJoker = prev[fixtureId]?.joker ?? myPredictions[fixtureId]?.is_joker ?? false
      const next = { ...prev }
      for (const f of pickableEight) {
        next[f.id] = { ...next[f.id], joker: f.id === fixtureId ? !currentlyJoker : false }
      }
      return next
    })
  }

  function isJoker(fixtureId) {
    return picks[fixtureId]?.joker ?? myPredictions[fixtureId]?.is_joker ?? false
  }

  async function submitAllPicks() {
    if (!isSupabaseConfigured || !auth?.user) {
      setSubmitNotice({ type: 'info', text: 'Sign in above to submit your predictions.' })
      return
    }
    if (pickableEight.length === 0) return

    setSubmitting(true)
    const rows = pickableEight.map((fixture) => ({
      user_id: auth.user.id,
      fixture_id: fixture.id,
      home_score_pick: picks[fixture.id]?.home ?? myPredictions[fixture.id]?.home_score_pick ?? 0,
      away_score_pick: picks[fixture.id]?.away ?? myPredictions[fixture.id]?.away_score_pick ?? 0,
      is_joker: isJoker(fixture.id),
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
      setSubmitNotice({ type: 'success', text: 'The Eight submitted.' })
      setReviewing(false)
    } else {
      setSubmitNotice({ type: 'error', text: 'Could not submit your predictions, try again.' })
    }
  }

  // theEight is built from every fixture featured for this round regardless
  // of status, so all 8 stay visible together as the round plays out —
  // pickableEight (still 'scheduled') is the subset the wizard can
  // actually take new picks for; you can't predict a game that's already
  // kicked off.
  const theEight = useMemo(() => buildTheEightFixtures(fixtures), [fixtures])
  const pickableEight = useMemo(() => theEight.filter((f) => f.status === 'scheduled'), [theEight])
  const roundKey = useMemo(() => computeRoundKey(theEight), [theEight])
  const lockTime = useMemo(() => computeLockTime(theEight), [theEight])
  const submittedAllPickable = pickableEight.length > 0 && pickableEight.every((f) => myPredictions[f.id])
  const submittedAll = submittedAllPickable || (pickableEight.length === 0 && theEight.length > 0)

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

  const lastWeekCorrect = lastWeek.filter((p) => p.points_awarded > 0).length
  const lastWeekPoints = lastWeek.reduce((sum, p) => sum + (p.points_awarded ?? 0), 0)
  const totalPoints = myLeaderboardIndex >= 0 ? sortedLeaderboard[myLeaderboardIndex].points : 0

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
        predictions={Object.values(myPredictions)}
        totalPoints={totalPoints}
        lastWeekPoints={lastWeekPoints}
      />

      {!auth?.user && (
        <div className="auth-card">
          <p>Sign in to save your predictions and appear on the leaderboard.</p>
          <button className="button" onClick={auth?.signInWithGoogle}>Continue with Google</button>
          <EmailPasswordAuth />
          {!isSupabaseConfigured && <p className="auth-note">Supabase isn't connected yet, this is a preview of the sign-in flow.</p>}
        </div>
      )}

      <details className="reference-panel">
        <summary className="reference-panel__toggle">Check form before you pick</summary>
        <CompactFormGuide fixtures={theEight} standings={standings} results={results} />
        <Link className="reference-panel__full-link" to="/">See the full table, results &amp; top scorers →</Link>
      </details>

      <h2 id="the-eight-picks">The Eight</h2>

      {SPONSORS_ENABLED && <SponsorModule slot="predictions_top" rotateKey={roundKey ?? ''} />}

      {theEight.length === 0 && <p className="auth-note">No fixtures open for picks right now.</p>}

      {/* Fixtures from this round that have already kicked off or finished
          stay visible here even while picks for the rest of the round are
          still open — otherwise they're invisible until every remaining
          pickable fixture is submitted, which reads as "only 4 of 8". */}
      {!submittedAll && theEight.length > pickableEight.length && (
        <ul className="results-list">
          {theEight.filter((f) => f.status !== 'scheduled').map((fixture) => {
            const pick = myPredictions[fixture.id]
            const isDecided = fixture.status === 'completed'
            return (
              <li key={fixture.id} className="result-row">
                <span className="result-row__round">{fixture.competition}</span>
                <span className="result-row__match">
                  <span className="result-row__team-name">{fixture.home_team}</span>
                  <span className="result-row__score">
                    {isDecided ? `${fixture.home_score} - ${fixture.away_score}` : 'v'}
                  </span>
                  <span className="result-row__team-name">{fixture.away_team}</span>
                </span>
                <span className="result-row__ground">
                  {!pick
                    ? 'No pick made'
                    : isDecided
                      ? `You picked ${pick.home_score_pick}-${pick.away_score_pick}${pick.points_awarded != null ? ` (+${pick.points_awarded} pts)` : ' (scoring soon)'}`
                      : `Your pick: ${pick.home_score_pick}-${pick.away_score_pick}, awaiting result`}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {theEight.length > 0 && submittedAll && (
        <TheEightSummary
          fixtures={theEight}
          picks={Object.fromEntries(
            theEight.map((f) => [
              f.id,
              {
                home: myPredictions[f.id]?.home_score_pick ?? 0,
                away: myPredictions[f.id]?.away_score_pick ?? 0,
                joker: myPredictions[f.id]?.is_joker ?? false,
                points: myPredictions[f.id]?.points_awarded ?? null,
              },
            ]),
          )}
          locked
          resultStats={resultStats}
          roundKey={roundKey ?? ''}
        />
      )}

      {pickableEight.length > 0 && !submittedAll && reviewing && (
        <TheEightSummary
          fixtures={pickableEight}
          picks={Object.fromEntries(
            pickableEight.map((f) => [
              f.id,
              { home: picks[f.id]?.home ?? myPredictions[f.id]?.home_score_pick ?? 0, away: picks[f.id]?.away ?? myPredictions[f.id]?.away_score_pick ?? 0, joker: isJoker(f.id) },
            ]),
          )}
          onEdit={(fixtureId) => {
            setEditStep(pickableEight.findIndex((f) => f.id === fixtureId))
            setReviewing(false)
          }}
          onSubmit={submitAllPicks}
          submitting={submitting}
        />
      )}

      {pickableEight.length > 0 && !submittedAll && !reviewing && (
        <TheEightWizard
          key={editStep ?? 'wizard'}
          fixtures={pickableEight}
          picks={picks}
          updatePick={updatePick}
          isJoker={isJoker}
          onSetJoker={setJoker}
          standings={standings}
          results={results}
          initialStep={editStep ?? 0}
          initialCompletedCount={editStep != null ? pickableEight.length - 1 : 0}
          onComplete={() => {
            setEditStep(null)
            setReviewing(true)
          }}
        />
      )}

      {submitNotice && (
        <p className={`form-notice form-notice--${submitNotice.type}`}>{submitNotice.text}</p>
      )}

      {auth?.user && lastWeek.length > 0 && (
        <>
          <h2>Last Week</h2>
          <p className="auth-note">🍾 = correct, 🍋 = wrong. Exact score is worth 3 points, correct outcome alone is worth 1.</p>
          <div className="table-scroll">
            <table className="last-week-table">
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Score</th>
                  <th>Outcome</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {lastWeek.map((p) => (
                  <tr key={p.id}>
                    <td className="last-week-table__game">
                      {p.fixtures.home_team} v {p.fixtures.away_team}
                      {p.is_joker && ' 🃏'}
                    </td>
                    <td className="last-week-table__outcome">{p.points_awarded === 3 ? '🍾' : '🍋'}</td>
                    <td className="last-week-table__outcome">{p.points_awarded > 0 ? '🍾' : '🍋'}</td>
                    <td>{p.points_awarded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="auth-note">{lastWeekCorrect}/{lastWeek.length} correct, {lastWeekPoints} points</p>
        </>
      )}

      <div className="predictions-social">
        <div>
          <h2>Leaderboard</h2>
          {leaderboard.some((entry) => entry.points > 0) ? (
            <ol className="leaderboard">
              {leaderboard.map((entry, i) => (
                <li key={entry.user_id ?? entry.display_name}>
                  <span className="leaderboard__rank">{i + 1}</span>
                  <span className="leaderboard__name">
                    {entry.display_name}
                    {entry.rounds_picked != null && (
                      <span className="leaderboard__rounds">{entry.rounds_picked} round{entry.rounds_picked === 1 ? '' : 's'} picked</span>
                    )}
                  </span>
                  <span className="leaderboard__points">{entry.points} pts</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="auth-note">Be the first on the board. Make your picks before kickoff.</p>
          )}
        </div>

        <Leagues />
      </div>
    </section>
  )
}
