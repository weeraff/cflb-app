import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { placeholderFixtures, placeholderLeaderboard } from '../lib/placeholderData'
import { PREDICTIONS_COMING_SOON } from '../lib/featureFlags'

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

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase
      .from('fixtures')
      .select('*')
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

    if (!error) setProfile(data)
  }

  function updatePick(fixtureId, field, value) {
    setPicks((prev) => ({
      ...prev,
      [fixtureId]: { ...prev[fixtureId], [field]: value },
    }))
  }

  async function submitPick(fixtureId) {
    const pick = picks[fixtureId]
    if (!pick || pick.home == null || pick.away == null) return

    if (!isSupabaseConfigured || !auth?.user) {
      window.alert('Sign in to save your prediction.')
      return
    }

    const { data, error } = await supabase
      .from('predictions')
      .upsert(
        {
          user_id: auth.user.id,
          fixture_id: fixtureId,
          home_score_pick: pick.home,
          away_score_pick: pick.away,
        },
        { onConflict: 'user_id,fixture_id' },
      )
      .select()
      .single()

    if (!error) {
      setMyPredictions((prev) => ({ ...prev, [fixtureId]: data }))
    }
  }

  async function handleEmailSignIn(e) {
    e.preventDefault()
    if (!email) return
    await auth?.signInWithEmail(email)
    setMagicLinkSent(true)
  }

  const upcoming = fixtures.filter((f) => f.status === 'scheduled')
  const awaitingResult = fixtures.filter((f) => f.status === 'locked')
  const recentlyDecided = fixtures
    .filter((f) => f.status === 'completed')
    .sort((a, b) => new Date(b.kickoff_at) - new Date(a.kickoff_at))
    .slice(0, 5)

  const needsDisplayName = auth?.user && profileChecked && !profile

  return (
    <section>
      <h1>Predictions</h1>
      <p className="section-subtitle">Pick the scoreline before kickoff. 3 points for an exact score, 1 for the right result.</p>

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
        </div>
      )}

      <h2>Upcoming Fixtures</h2>
      <div className="fixture-list">
        {upcoming.map((fixture) => {
          const existing = myPredictions[fixture.id]
          return (
            <div key={fixture.id} className="fixture-card">
              <div className="fixture-card__meta">
                <span className="fixture-card__competition">{fixture.competition}</span>
                <span className="fixture-card__kickoff">{formatKickoff(fixture.kickoff_at)}</span>
              </div>
              <div className="fixture-card__teams">
                <span>{fixture.home_team}</span>
                <input
                  type="number"
                  min="0"
                  className="score-input"
                  defaultValue={existing?.home_score_pick}
                  onChange={(e) => updatePick(fixture.id, 'home', Number(e.target.value))}
                />
                <span className="fixture-card__vs">v</span>
                <input
                  type="number"
                  min="0"
                  className="score-input"
                  defaultValue={existing?.away_score_pick}
                  onChange={(e) => updatePick(fixture.id, 'away', Number(e.target.value))}
                />
                <span>{fixture.away_team}</span>
              </div>
              <button className="button button--small" onClick={() => submitPick(fixture.id)}>
                {existing ? 'Update pick' : 'Save pick'}
              </button>
            </div>
          )
        })}
        {upcoming.length === 0 && <p className="auth-note">No upcoming fixtures open for picks right now.</p>}
      </div>

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
                    <span className="result-row__team">{fixture.home_team}</span>
                    <span className="result-row__score">v</span>
                    <span className="result-row__team">{fixture.away_team}</span>
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
                    <span className="result-row__team">{fixture.home_team}</span>
                    <span className="result-row__score">{fixture.home_score} - {fixture.away_score}</span>
                    <span className="result-row__team">{fixture.away_team}</span>
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

      <h2>Leaderboard</h2>
      <ol className="leaderboard">
        {leaderboard.map((entry, i) => (
          <li key={entry.user_id ?? entry.display_name}>
            <span className="leaderboard__rank">{i + 1}</span>
            <span className="leaderboard__name">{entry.display_name}</span>
            <span className="leaderboard__points">{entry.points} pts</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function formatKickoff(iso) {
  return new Date(iso).toLocaleString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}
