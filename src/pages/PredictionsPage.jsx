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
  const [leaderboard, setLeaderboard] = useState(placeholderLeaderboard)
  const [picks, setPicks] = useState({})
  const [email, setEmail] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase.from('fixtures').select('*').order('kickoff_at').then(({ data, error }) => {
      if (!error && data?.length) setFixtures(data)
    })
  }, [])

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
      window.alert('Prediction saved locally (connect Supabase and sign in to make this permanent).')
      return
    }

    await supabase.from('predictions').upsert({
      user_id: auth.user.id,
      fixture_id: fixtureId,
      home_score_pick: pick.home,
      away_score_pick: pick.away,
    })
  }

  async function handleEmailSignIn(e) {
    e.preventDefault()
    if (!email) return
    await auth?.signInWithEmail(email)
    setMagicLinkSent(true)
  }

  return (
    <section>
      <h1>Predictions</h1>
      <p className="section-subtitle">Pick the scoreline for each fixture before kickoff. Points tally on the leaderboard.</p>

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

      <div className="fixture-list">
        {fixtures.map((fixture) => (
          <div key={fixture.id} className="fixture-card">
            <div className="fixture-card__teams">
              <span>{fixture.home_team}</span>
              <input
                type="number"
                min="0"
                className="score-input"
                onChange={(e) => updatePick(fixture.id, 'home', Number(e.target.value))}
              />
              <span className="fixture-card__vs">v</span>
              <input
                type="number"
                min="0"
                className="score-input"
                onChange={(e) => updatePick(fixture.id, 'away', Number(e.target.value))}
              />
              <span>{fixture.away_team}</span>
            </div>
            <button className="button button--small" onClick={() => submitPick(fixture.id)}>
              Save pick
            </button>
          </div>
        ))}
      </div>

      <h2>Leaderboard</h2>
      <ol className="leaderboard">
        {leaderboard.map((entry, i) => (
          <li key={entry.display_name}>
            <span className="leaderboard__rank">{i + 1}</span>
            <span className="leaderboard__name">{entry.display_name}</span>
            <span className="leaderboard__points">{entry.points} pts</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
