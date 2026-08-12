import { useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import TeamCrest from './TeamCrest'

export default function LiveScoreStrip() {
  const [fixtures, setFixtures] = useState([])
  const [events, setEvents] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const fixturesRef = useRef([])
  fixturesRef.current = fixtures

  useEffect(() => {
    if (!isSupabaseConfigured) return

    loadLiveFixtures()

    const channel = supabase
      .channel('live-score-strip')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fixtures' }, loadLiveFixtures)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_events' }, () => {
        loadEvents(fixturesRef.current.map((f) => f.id))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  function loadLiveFixtures() {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    supabase
      .from('fixtures')
      .select('*')
      .in('reported_status', ['live', 'full_time'])
      .gte('kickoff_at', since)
      .order('kickoff_at', { ascending: true })
      .then(({ data, error }) => {
        if (error || !data) return
        setFixtures(data)
        loadEvents(data.map((f) => f.id))
      })
  }

  function loadEvents(fixtureIds) {
    if (fixtureIds.length === 0) {
      setEvents([])
      return
    }
    supabase
      .from('match_events')
      .select('*')
      .in('fixture_id', fixtureIds)
      .order('minute', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setEvents(data)
      })
  }

  if (fixtures.length === 0) return null

  return (
    <div className="live-strip">
      <h2 className="podcast-column-heading">Live Now</h2>
      <div className="live-strip__cards">
        {fixtures.map((fixture) => {
          const fixtureEvents = events.filter((e) => e.fixture_id === fixture.id)
          const homeGoals = fixtureEvents.filter((e) => e.type === 'goal' && e.team === 'home').length
          const awayGoals = fixtureEvents.filter((e) => e.type === 'goal' && e.team === 'away').length
          const isExpanded = expandedId === fixture.id

          return (
            <div key={fixture.id} className="live-card">
              <button
                className="live-card__summary"
                onClick={() => setExpandedId(isExpanded ? null : fixture.id)}
                aria-expanded={isExpanded}
              >
                <span className={`live-card__badge live-card__badge--${fixture.reported_status}`}>
                  {fixture.reported_status === 'live' ? 'Live' : 'FT'}
                </span>
                <span className="live-card__team">
                  <TeamCrest src={fixture.home_logo} name={fixture.home_team} />
                  {fixture.home_team}
                </span>
                <span className="live-card__score">{homeGoals} - {awayGoals}</span>
                <span className="live-card__team">
                  <TeamCrest src={fixture.away_logo} name={fixture.away_team} />
                  {fixture.away_team}
                </span>
              </button>

              {isExpanded && (
                <ul className="live-card__events">
                  {fixtureEvents.length === 0 && <li className="auth-note">No events logged yet.</li>}
                  {fixtureEvents.map((ev) => (
                    <li key={ev.id}>
                      <span className="reporter-event__minute">{ev.minute}'</span>
                      {ev.type === 'goal'
                        ? `${ev.team === 'home' ? fixture.home_team : fixture.away_team} — ${ev.player_name}${ev.assist_name ? ` (assist: ${ev.assist_name})` : ''}`
                        : `${ev.card_type === 'red' ? 'Red' : 'Yellow'} card — ${ev.player_name} (${ev.team === 'home' ? fixture.home_team : fixture.away_team})`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
