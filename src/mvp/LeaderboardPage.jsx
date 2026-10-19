import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { sortLeaderboard } from '../lib/leaderboard'
import { useMvp } from './MvpLayout'
import { generateLeagueCode, joinUrl } from './lib/leagueCode'

const TOP = 50

function Table({ rows, myId, emptyText }) {
  if (rows.length === 0) return <div className="m-notice">{emptyText}</div>

  const myIndex = rows.findIndex((r) => r.user_id === myId)
  const visible = rows.slice(0, TOP).map((r, i) => ({ ...r, pos: i + 1 }))
  const pinned = myIndex >= TOP ? { ...rows[myIndex], pos: myIndex + 1 } : null

  const Row = ({ r, gap }) => (
    <div className={`m-row${r.user_id === myId ? ' m-row--me' : ''}${gap ? ' m-row--gap' : ''}`}>
      <span className="m-row__pos">{r.pos}</span>
      <span className="m-row__name">{r.display_name}</span>
      <span className="m-row__num">{r.scores ?? 0}</span>
      <span className="m-row__pts">{r.points}</span>
    </div>
  )

  return (
    <div className="m-table" role="table">
      <div className="m-row m-row--head">
        <span>#</span>
        <span>Player</span>
        <span className="m-row__num" title="Exact scores">Exact</span>
        <span className="m-row__pts">Pts</span>
      </div>
      {visible.map((r) => (
        <Row key={r.user_id} r={r} />
      ))}
      {pinned && <Row r={pinned} gap />}
    </div>
  )
}

async function shareLeague(league) {
  const url = joinUrl(league.code)
  const text = `Join my ${league.name} league on Champagne Football. Predict the Australian Championship scores:`
  try {
    if (navigator.share) {
      await navigator.share({ title: league.name, text, url })
      return null
    }
    await navigator.clipboard.writeText(`${text} ${url}`)
    return 'Link copied. Paste it in the group chat.'
  } catch (err) {
    if (err?.name === 'AbortError') return null
    return `Share this link: ${url}`
  }
}

export default function LeaderboardPage() {
  const { user, openSignUp } = useMvp()
  const [params, setParams] = useSearchParams()
  const [board, setBoard] = useState(null)
  const [leagues, setLeagues] = useState([])
  const [members, setMembers] = useState({})
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [leagueName, setLeagueName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const tab = params.get('league') ?? 'overall'

  const loadBoard = useCallback(async () => {
    if (!isSupabaseConfigured) return
    const { data, error: boardError } = await supabase.from('leaderboard').select('*')
    if (boardError) setError("Couldn't load the leaderboard.")
    else setBoard(sortLeaderboard(data ?? []))
  }, [])

  const loadLeagues = useCallback(async () => {
    if (!user) {
      setLeagues([])
      return
    }
    const { data } = await supabase.from('league_members').select('league_id, leagues(id, name, code, created_by)').eq('user_id', user.id)
    const list = (data ?? [])
      .map((row) => (Array.isArray(row.leagues) ? row.leagues[0] : row.leagues))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name))
    setLeagues(list)
  }, [user])

  useEffect(() => {
    loadBoard()
  }, [loadBoard])

  useEffect(() => {
    loadLeagues()
  }, [loadLeagues])

  const activeLeague = leagues.find((l) => l.id === tab) ?? null

  // Members of the open league, with names for anyone yet to score.
  useEffect(() => {
    if (!activeLeague || members[activeLeague.id]) return
    ;(async () => {
      const { data: rows } = await supabase.from('league_members').select('user_id').eq('league_id', activeLeague.id)
      const ids = (rows ?? []).map((r) => r.user_id)
      const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, display_name').in('id', ids) : { data: [] }
      setMembers((m) => ({ ...m, [activeLeague.id]: profiles ?? [] }))
    })()
  }, [activeLeague, members])

  const rows = useMemo(() => {
    if (!board) return []
    if (!activeLeague) return board
    const people = members[activeLeague.id]
    if (!people) return []
    const byId = Object.fromEntries(board.map((r) => [r.user_id, r]))
    return sortLeaderboard(people.map((p) => byId[p.id] ?? { user_id: p.id, display_name: p.display_name, points: 0, scores: 0, outcomes: 0 }))
  }, [board, activeLeague, members])

  function selectTab(id) {
    setMessage(null)
    setParams(id === 'overall' ? {} : { league: id }, { replace: true })
  }

  async function createLeague(e) {
    e.preventDefault()
    const name = leagueName.trim()
    if (!name || busy) return
    setBusy(true)
    setMessage(null)
    let league = null
    for (let attempt = 0; attempt < 3 && !league; attempt++) {
      const { data, error: insertError } = await supabase
        .from('leagues')
        .insert({ name: name.slice(0, 40), code: generateLeagueCode(), created_by: user.id })
        .select()
        .single()
      if (!insertError) league = data
      else if (insertError.code !== '23505') break
    }
    if (!league) {
      setBusy(false)
      setMessage("Couldn't create the league. Try again.")
      return
    }
    await supabase.from('league_members').insert({ league_id: league.id, user_id: user.id })
    setBusy(false)
    setCreating(false)
    setLeagueName('')
    await loadLeagues()
    selectTab(league.id)
    setMessage(await shareLeague(league))
  }

  async function leaveLeague(league) {
    if (!window.confirm(`Leave ${league.name}?`)) return
    const { error: leaveError } = await supabase.from('league_members').delete().eq('league_id', league.id).eq('user_id', user.id)
    if (leaveError) {
      setMessage("Couldn't leave the league. Try again.")
      return
    }
    setMembers((m) => {
      const next = { ...m }
      delete next[league.id]
      return next
    })
    selectTab('overall')
    loadLeagues()
  }

  return (
    <div className="m-app">
      <header className="m-head">
        <div className="m-head__top">
          <img className="m-head__logo" src="/logo-header.png" alt="Champagne Football Lemonade Banter" />
          {!user && (
            <button type="button" className="m-link-button" onClick={() => openSignUp('signin')}>
              Sign in
            </button>
          )}
        </div>
        <h1 className="m-head__title">Leaderboard</h1>
        <div className="m-tabs-inline" role="tablist" style={{ marginTop: '0.75rem' }}>
          <button type="button" role="tab" aria-selected={tab === 'overall'} className="m-press" onClick={() => selectTab('overall')}>
            Overall
          </button>
          {leagues.map((l) => (
            <button key={l.id} type="button" role="tab" aria-selected={tab === l.id} className="m-press" onClick={() => selectTab(l.id)}>
              {l.name}
            </button>
          ))}
        </div>
      </header>

      <main className="m-list">
        {error && <div className="m-notice m-notice--error">{error}</div>}
        {message && <div className="m-notice" role="status">{message}</div>}

        {board && (
          <Table
            rows={rows}
            myId={user?.id}
            emptyText={activeLeague ? 'Loading your league...' : 'No points yet. The board fills up after the first full time.'}
          />
        )}

        {activeLeague && (
          <div className="m-notice">
            <strong>{activeLeague.name}</strong>
            <div className="m-share" style={{ marginTop: '0.5rem' }}>
              <span>Code</span>
              <code>{activeLeague.code}</code>
            </div>
            <div className="m-league-actions" style={{ marginTop: '0.75rem' }}>
              <button type="button" className="m-btn m-press" onClick={async () => setMessage(await shareLeague(activeLeague))}>
                Invite your mates
              </button>
              <button type="button" className="m-btn m-btn--light m-press" onClick={() => leaveLeague(activeLeague)}>
                Leave league
              </button>
            </div>
          </div>
        )}

        {user ? (
          creating ? (
            <form className="m-notice m-form" onSubmit={createLeague}>
              <label className="m-field">
                League name
                <input className="m-input" value={leagueName} onChange={(e) => setLeagueName(e.target.value)} maxLength={40} placeholder="Sunday League Legends" required autoFocus />
              </label>
              <button type="submit" className="m-btn m-btn--block m-press" disabled={busy}>
                {busy ? 'Creating...' : 'Create and get invite link'}
              </button>
              <button type="button" className="m-btn m-btn--light m-btn--block m-press" onClick={() => setCreating(false)}>
                Cancel
              </button>
            </form>
          ) : (
            <div className="m-notice">
              <strong>Play against your mates</strong>
              Start a private league and share the link. Everyone still counts on the overall board.
              <div>
                <button type="button" className="m-btn m-press" onClick={() => setCreating(true)}>
                  Create a league
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="m-notice">
            <strong>Want your own league?</strong>
            Make your picks and create an account, then start a league for your mates.
          </div>
        )}
      </main>
    </div>
  )
}
