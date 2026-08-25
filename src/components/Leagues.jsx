import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode() {
  let code = ''
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return code
}

export default function Leagues() {
  const auth = useAuth()
  const [myLeagues, setMyLeagues] = useState([])
  const [selectedLeagueId, setSelectedLeagueId] = useState('')
  const [leagueLeaderboard, setLeagueLeaderboard] = useState([])
  const [leagueName, setLeagueName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || !auth?.user) {
      setMyLeagues([])
      return
    }
    refreshMyLeagues()
  }, [auth?.user])

  useEffect(() => {
    if (!selectedLeagueId) {
      setLeagueLeaderboard([])
      return
    }
    loadLeagueLeaderboard(selectedLeagueId)
  }, [selectedLeagueId])

  async function refreshMyLeagues(preferLeagueId) {
    const { data, error } = await supabase
      .from('league_members')
      .select('league_id, leagues (id, name, code)')
      .eq('user_id', auth.user.id)

    if (error || !data) return

    const leagues = data.map((row) => row.leagues).filter(Boolean)
    setMyLeagues(leagues)

    if (preferLeagueId) {
      setSelectedLeagueId(preferLeagueId)
    } else if (leagues.length > 0 && !leagues.some((l) => l.id === selectedLeagueId)) {
      setSelectedLeagueId(leagues[0].id)
    }
  }

  async function loadLeagueLeaderboard(leagueId) {
    const { data: members, error: membersError } = await supabase
      .from('league_members')
      .select('user_id')
      .eq('league_id', leagueId)

    if (membersError || !members?.length) {
      setLeagueLeaderboard([])
      return
    }

    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .in('user_id', members.map((m) => m.user_id))
      .order('points', { ascending: false })

    if (!error && data) setLeagueLeaderboard(data)
  }

  async function createLeague(e) {
    e.preventDefault()
    if (!leagueName.trim() || !auth?.user) return

    setBusy(true)
    setNotice(null)
    const code = generateCode()

    const { data: league, error } = await supabase
      .from('leagues')
      .insert({ name: leagueName.trim(), code, created_by: auth.user.id })
      .select()
      .single()

    if (error) {
      setBusy(false)
      setNotice({ type: 'error', text: 'Could not create the league, try again.' })
      return
    }

    const { error: joinError } = await supabase
      .from('league_members')
      .insert({ league_id: league.id, user_id: auth.user.id })

    setBusy(false)
    if (joinError) {
      setNotice({ type: 'error', text: 'League created but could not join it, try again.' })
      return
    }

    setLeagueName('')
    setNotice({ type: 'success', text: `"${league.name}" created — share the invite code below.` })
    refreshMyLeagues(league.id)
  }

  async function joinLeague(e) {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (!code || !auth?.user) return

    setBusy(true)
    setNotice(null)

    const { data: league, error } = await supabase
      .from('leagues')
      .select('id, name')
      .eq('code', code)
      .maybeSingle()

    if (error || !league) {
      setBusy(false)
      setNotice({ type: 'error', text: 'No league found with that code.' })
      return
    }

    const { error: joinError } = await supabase
      .from('league_members')
      .insert({ league_id: league.id, user_id: auth.user.id })

    setBusy(false)
    if (joinError) {
      if (joinError.code === '23505') {
        setNotice({ type: 'info', text: `You're already in "${league.name}".` })
        refreshMyLeagues(league.id)
      } else {
        setNotice({ type: 'error', text: 'Could not join that league, try again.' })
      }
      return
    }

    setJoinCode('')
    setNotice({ type: 'success', text: `Joined "${league.name}".` })
    refreshMyLeagues(league.id)
  }

  if (!isSupabaseConfigured || !auth?.user) {
    return (
      <>
        <h2>Leagues</h2>
        <p className="auth-note">Sign in to create or join a mini-league with your mates.</p>
      </>
    )
  }

  const selectedLeague = myLeagues.find((l) => l.id === selectedLeagueId)

  return (
    <>
      <h2>Leagues</h2>
      <p className="section-subtitle">Create a private league with your mates, or join one with an invite code.</p>

      <div className="league-forms">
        <form onSubmit={createLeague} className="league-form">
          <input
            type="text"
            placeholder="League name"
            value={leagueName}
            onChange={(e) => setLeagueName(e.target.value)}
            maxLength={40}
          />
          <button className="button button--small" type="submit" disabled={busy}>Create League</button>
        </form>
        <form onSubmit={joinLeague} className="league-form">
          <input
            type="text"
            placeholder="Invite code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            maxLength={6}
          />
          <button className="button button--small button--secondary" type="submit" disabled={busy}>Join League</button>
        </form>
      </div>

      {notice && <p className={`form-notice form-notice--${notice.type}`}>{notice.text}</p>}

      {myLeagues.length > 0 && (
        <div className="league-view">
          <select
            className="competition-select"
            value={selectedLeagueId}
            onChange={(e) => setSelectedLeagueId(e.target.value)}
          >
            {myLeagues.map((league) => (
              <option key={league.id} value={league.id}>{league.name}</option>
            ))}
          </select>

          {selectedLeague && (
            <p className="league-invite">
              Invite code: <strong>{selectedLeague.code}</strong>. Share it so mates can join.
            </p>
          )}

          {leagueLeaderboard.some((entry) => entry.points > 0) ? (
            <ol className="leaderboard">
              {leagueLeaderboard.map((entry, i) => (
                <li key={entry.user_id}>
                  <span className="leaderboard__rank">{i + 1}</span>
                  <span className="leaderboard__name">{entry.display_name}</span>
                  <span className="leaderboard__points">{entry.points} pts</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="auth-note">No picks made in this league yet. Be the first.</p>
          )}
        </div>
      )}
    </>
  )
}
