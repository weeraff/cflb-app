import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { formatKickoff } from '../lib/format'

export default function ReporterPage() {
  const auth = useAuth()
  const [isReporter, setIsReporter] = useState(null)
  const [fixtures, setFixtures] = useState([])
  const [selectedFixtureId, setSelectedFixtureId] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured || !auth?.user) {
      setIsReporter(false)
      return
    }
    supabase
      .from('profiles')
      .select('is_reporter')
      .eq('id', auth.user.id)
      .maybeSingle()
      .then(({ data }) => setIsReporter(Boolean(data?.is_reporter)))
  }, [auth?.user])

  useEffect(() => {
    if (!isReporter) return

    const windowStart = new Date(Date.now() - 12 * 3600 * 1000).toISOString()
    const windowEnd = new Date(Date.now() + 36 * 3600 * 1000).toISOString()

    supabase
      .from('fixtures')
      .select('*')
      .gte('kickoff_at', windowStart)
      .lte('kickoff_at', windowEnd)
      .order('kickoff_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setFixtures(data)
      })
  }, [isReporter])

  if (!isSupabaseConfigured || isReporter === null) {
    return (
      <section>
        <h1>Reporter</h1>
        <p className="section-subtitle">Checking access…</p>
      </section>
    )
  }

  if (!auth?.user) {
    return (
      <section>
        <h1>Reporter</h1>
        <p className="auth-note">Sign in with an allowlisted reporter account to use this page.</p>
      </section>
    )
  }

  if (!isReporter) {
    return (
      <section>
        <h1>Reporter</h1>
        <p className="auth-note">This account isn't on the reporter allowlist.</p>
      </section>
    )
  }

  const selectedFixture = fixtures.find((f) => f.id === selectedFixtureId)

  return (
    <section>
      <h1>Reporter</h1>
      <p className="section-subtitle">Log goals, cards and lineups as they happen. Updates push to the live view instantly.</p>

      <label className="competition-select-label" htmlFor="fixture-select">Fixture</label>
      <select
        id="fixture-select"
        className="competition-select"
        value={selectedFixtureId}
        onChange={(e) => setSelectedFixtureId(e.target.value)}
      >
        <option value="">Select a fixture…</option>
        {fixtures.map((f) => (
          <option key={f.id} value={f.id}>
            {f.home_team} v {f.away_team} — {formatKickoff(f.kickoff_at)}
          </option>
        ))}
      </select>

      {selectedFixture && <FixtureReporter fixture={selectedFixture} onStatusChange={(next) => {
        setFixtures((prev) => prev.map((f) => (f.id === next.id ? next : f)))
      }} />}
    </section>
  )
}

function FixtureReporter({ fixture, onStatusChange }) {
  const [events, setEvents] = useState([])
  const [goalForm, setGoalForm] = useState({ minute: '', team: 'home', player_name: '', assist_name: '' })
  const [cardForm, setCardForm] = useState({ minute: '', team: 'home', player_name: '', card_type: 'yellow' })
  const [lineupDraft, setLineupDraft] = useState({
    home: { starting_xi: '', subs: '' },
    away: { starting_xi: '', subs: '' },
  })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    refreshEvents()
    refreshLineups()
  }, [fixture.id])

  function refreshEvents() {
    supabase
      .from('match_events')
      .select('*')
      .eq('fixture_id', fixture.id)
      .order('minute', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setEvents(data)
      })
  }

  function refreshLineups() {
    supabase
      .from('match_lineups')
      .select('*')
      .eq('fixture_id', fixture.id)
      .then(({ data, error }) => {
        if (error || !data) return
        const byTeam = {}
        for (const row of data) byTeam[row.team] = row
        setLineupDraft({
          home: { starting_xi: byTeam.home?.starting_xi ?? '', subs: byTeam.home?.subs ?? '' },
          away: { starting_xi: byTeam.away?.starting_xi ?? '', subs: byTeam.away?.subs ?? '' },
        })
      })
  }

  async function setStatus(reported_status) {
    setBusy(true)
    const { data, error } = await supabase
      .from('fixtures')
      .update({ reported_status })
      .eq('id', fixture.id)
      .select()
      .single()
    setBusy(false)
    if (!error && data) {
      onStatusChange(data)
      setNotice({ type: 'success', text: `Match marked ${reported_status === 'live' ? 'live' : 'full time'}.` })
    } else {
      setNotice({ type: 'error', text: 'Could not update match status, try again.' })
    }
  }

  async function addGoal(e) {
    e.preventDefault()
    if (!goalForm.minute || !goalForm.player_name.trim()) return
    setBusy(true)
    const { error } = await supabase.from('match_events').insert({
      fixture_id: fixture.id,
      type: 'goal',
      minute: Number(goalForm.minute),
      team: goalForm.team,
      player_name: goalForm.player_name.trim(),
      assist_name: goalForm.assist_name.trim() || null,
    })
    setBusy(false)
    if (!error) {
      setGoalForm({ minute: '', team: 'home', player_name: '', assist_name: '' })
      refreshEvents()
    } else {
      setNotice({ type: 'error', text: 'Could not add that goal, try again.' })
    }
  }

  async function addCard(e) {
    e.preventDefault()
    if (!cardForm.minute || !cardForm.player_name.trim()) return
    setBusy(true)
    const { error } = await supabase.from('match_events').insert({
      fixture_id: fixture.id,
      type: 'card',
      minute: Number(cardForm.minute),
      team: cardForm.team,
      player_name: cardForm.player_name.trim(),
      card_type: cardForm.card_type,
    })
    setBusy(false)
    if (!error) {
      setCardForm({ minute: '', team: 'home', player_name: '', card_type: 'yellow' })
      refreshEvents()
    } else {
      setNotice({ type: 'error', text: 'Could not add that card, try again.' })
    }
  }

  async function removeEvent(id) {
    setBusy(true)
    const { error } = await supabase.from('match_events').delete().eq('id', id)
    setBusy(false)
    if (!error) refreshEvents()
  }

  async function saveLineup(team) {
    setBusy(true)
    const { error } = await supabase.from('match_lineups').upsert({
      fixture_id: fixture.id,
      team,
      starting_xi: lineupDraft[team].starting_xi,
      subs: lineupDraft[team].subs,
    })
    setBusy(false)
    if (!error) {
      setNotice({ type: 'success', text: `${team === 'home' ? fixture.home_team : fixture.away_team} lineup saved.` })
      refreshLineups()
    } else {
      setNotice({ type: 'error', text: 'Could not save that lineup, try again.' })
    }
  }

  return (
    <div className="reporter-fixture">
      <div className="reporter-fixture__status">
        <span className={`reporter-status reporter-status--${fixture.reported_status}`}>
          {fixture.reported_status === 'live' ? 'Live' : fixture.reported_status === 'full_time' ? 'Full time' : 'Not started'}
        </span>
        <div className="reporter-fixture__actions">
          <button className="button button--small button--secondary" disabled={busy || fixture.reported_status === 'live'} onClick={() => setStatus('live')}>Go Live</button>
          <button className="button button--small" disabled={busy || fixture.reported_status === 'full_time'} onClick={() => setStatus('full_time')}>Full Time</button>
        </div>
      </div>

      {notice && <p className={`form-notice form-notice--${notice.type}`}>{notice.text}</p>}

      <h2>Add Goal</h2>
      <form onSubmit={addGoal} className="reporter-form">
        <input type="number" min="0" placeholder="Min" value={goalForm.minute} onChange={(e) => setGoalForm({ ...goalForm, minute: e.target.value })} />
        <select value={goalForm.team} onChange={(e) => setGoalForm({ ...goalForm, team: e.target.value })}>
          <option value="home">{fixture.home_team}</option>
          <option value="away">{fixture.away_team}</option>
        </select>
        <input type="text" placeholder="Scorer" value={goalForm.player_name} onChange={(e) => setGoalForm({ ...goalForm, player_name: e.target.value })} />
        <input type="text" placeholder="Assist (optional)" value={goalForm.assist_name} onChange={(e) => setGoalForm({ ...goalForm, assist_name: e.target.value })} />
        <button className="button button--small" type="submit" disabled={busy}>Add Goal</button>
      </form>

      <h2>Add Card</h2>
      <form onSubmit={addCard} className="reporter-form">
        <input type="number" min="0" placeholder="Min" value={cardForm.minute} onChange={(e) => setCardForm({ ...cardForm, minute: e.target.value })} />
        <select value={cardForm.team} onChange={(e) => setCardForm({ ...cardForm, team: e.target.value })}>
          <option value="home">{fixture.home_team}</option>
          <option value="away">{fixture.away_team}</option>
        </select>
        <input type="text" placeholder="Player" value={cardForm.player_name} onChange={(e) => setCardForm({ ...cardForm, player_name: e.target.value })} />
        <select value={cardForm.card_type} onChange={(e) => setCardForm({ ...cardForm, card_type: e.target.value })}>
          <option value="yellow">Yellow</option>
          <option value="red">Red</option>
        </select>
        <button className="button button--small button--secondary" type="submit" disabled={busy}>Add Card</button>
      </form>

      <h2>Events</h2>
      {events.length === 0 && <p className="auth-note">No events logged yet.</p>}
      <ul className="reporter-events">
        {events.map((ev) => (
          <li key={ev.id} className="reporter-event">
            <span className="reporter-event__minute">{ev.minute}'</span>
            <span className="reporter-event__body">
              {ev.type === 'goal'
                ? `Goal — ${ev.player_name}${ev.assist_name ? ` (assist: ${ev.assist_name})` : ''}`
                : `${ev.card_type === 'red' ? 'Red' : 'Yellow'} card — ${ev.player_name}`}
              <span className="reporter-event__team"> ({ev.team === 'home' ? fixture.home_team : fixture.away_team})</span>
            </span>
            <button className="reporter-event__remove" onClick={() => removeEvent(ev.id)} aria-label="Remove event">✕</button>
          </li>
        ))}
      </ul>

      <h2>Lineups</h2>
      {['home', 'away'].map((team) => (
        <div className="reporter-lineup" key={team}>
          <h3>{team === 'home' ? fixture.home_team : fixture.away_team}</h3>
          <textarea
            placeholder="Starting XI, one per line"
            rows={4}
            value={lineupDraft[team].starting_xi}
            onChange={(e) => setLineupDraft({ ...lineupDraft, [team]: { ...lineupDraft[team], starting_xi: e.target.value } })}
          />
          <textarea
            placeholder="Subs, one per line"
            rows={2}
            value={lineupDraft[team].subs}
            onChange={(e) => setLineupDraft({ ...lineupDraft, [team]: { ...lineupDraft[team], subs: e.target.value } })}
          />
          <button className="button button--small button--secondary" onClick={() => saveLineup(team)} disabled={busy}>
            Save {team === 'home' ? fixture.home_team : fixture.away_team} Lineup
          </button>
        </div>
      ))}
    </div>
  )
}
