import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useMvp } from './MvpLayout'
import AccountLine from './AccountLine'
import { savePending } from './lib/pendingSignup'

export default function JoinLeaguePage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useMvp()
  const [league, setLeague] = useState(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.rpc('league_preview', { p_code: code }).then(({ data, error: previewError }) => {
      setLeague(previewError ? null : (data?.[0] ?? null))
    })
  }, [code])

  async function join() {
    setError(null)
    if (!user) {
      // Remember the invite; it's applied once they've signed up.
      savePending({ joinCode: code, joinName: league.league_name })
      navigate('/')
      return
    }
    setBusy(true)
    const { data, error: joinError } = await supabase.rpc('join_league_by_code', { p_code: code })
    setBusy(false)
    if (joinError) {
      setError("Couldn't join. Try again.")
      return
    }
    navigate(`/leaderboard?league=${data[0].league_id}`)
  }

  return (
    <div className="m-app">
      <header className="m-head">
        <div className="m-head__top">
          <img className="m-head__logo" src="/logo-header.png" alt="Champagne Football Lemonade Banter" />
        </div>
        <h1 className="m-head__title">{league ? `Join ${league.league_name}` : 'Join a league'}</h1>
        {league && (
          <p className="m-head__sub">
            {league.member_count} {league.member_count === 1 ? 'player' : 'players'} so far. Free to play. Predict the Australian Championship and see who knows their football.
          </p>
        )}
        <AccountLine />
      </header>

      <main className="m-list">
        {league === null && (
          <div className="m-notice m-notice--error" role="alert">
            That league link doesn't work. Ask your mate to share it again.
          </div>
        )}
        {league && (
          <div className="m-notice">
            {error && <p className="m-form-msg m-form-msg--error" role="alert">{error}</p>}
            <button type="button" className="m-btn m-btn--block m-press" onClick={join} disabled={busy}>
              {busy ? 'Joining...' : user ? 'Join league' : 'Make my picks and join'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
