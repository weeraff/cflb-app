import { useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import FixtureTeamRow from './FixtureTeamRow'
import LiveStreamEmbed from './LiveStreamEmbed'
import MatchEventRow from './MatchEventRow'

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
      // Two independent "this is live" signals: reported_status is the
      // flash reporter manually toggling a match, stream_status is the
      // automated YouTube match going live on its own — a fixture can hit
      // either without the other, so both need to surface a card here.
      .or('reported_status.in.(live,full_time),stream_status.eq.live')
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
          const fixtureEvents = events.filter(
            (e) => e.fixture_id === fixture.id && !(e.type === 'card' && e.card_type === 'yellow'),
          )
          const homeGoals = fixtureEvents.filter((e) => e.type === 'goal' && e.team === 'home').length
          const awayGoals = fixtureEvents.filter((e) => e.type === 'goal' && e.team === 'away').length
          const isExpanded = expandedId === fixture.id
          const isLive = fixture.reported_status === 'live' || fixture.stream_status === 'live'
          const hasStream = fixture.stream_status === 'live' && fixture.youtube_video_id

          return (
            <div key={fixture.id} className="live-card">
              <button
                className="live-card__summary"
                onClick={() => setExpandedId(isExpanded ? null : fixture.id)}
                aria-expanded={isExpanded}
              >
                <span className={`live-card__badge live-card__badge--${isLive ? 'live' : 'full_time'}`}>
                  {isLive ? 'Live' : 'FT'}
                </span>
                <FixtureTeamRow className="live-card__team" logo={fixture.home_logo} name={fixture.home_team} />
                <span className="live-card__score">{homeGoals} - {awayGoals}</span>
                <FixtureTeamRow className="live-card__team" logo={fixture.away_logo} name={fixture.away_team} />
                {isLive && (
                  <span className={`live-card__watch${hasStream ? '' : ' live-card__watch--unavailable'}`}>
                    {hasStream ? '▶ Watch' : 'Stream unavailable'}
                  </span>
                )}
              </button>

              {isExpanded && hasStream && (
                <LiveStreamEmbed videoId={fixture.youtube_video_id} title={`${fixture.home_team} v ${fixture.away_team}`} />
              )}

              {isExpanded && (
                <ul className="live-card__events">
                  {fixtureEvents.length === 0 && <li className="auth-note">No events logged yet.</li>}
                  {fixtureEvents.map((ev) => (
                    <MatchEventRow key={ev.id} event={ev} homeTeam={fixture.home_team} awayTeam={fixture.away_team} />
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
