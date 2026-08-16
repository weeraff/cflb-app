import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import TeamCrest from './TeamCrest'
import LiveStreamEmbed from './LiveStreamEmbed'

const RESULTS_LIMIT = 5

export default function RecentResults() {
  const [fixtures, setFixtures] = useState([])
  const [events, setEvents] = useState([])
  const [detailId, setDetailId] = useState(null)
  const [watchId, setWatchId] = useState(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase
      .from('fixtures')
      .select('*')
      .eq('competition', 'NPL NSW')
      .eq('status', 'completed')
      .order('kickoff_at', { ascending: false })
      .limit(RESULTS_LIMIT)
      .then(({ data, error }) => {
        if (error || !data) return
        setFixtures(data)
        loadEvents(data.map((f) => f.id))
      })
  }, [])

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
    <section>
      <h2 className="results-heading">Recent Results</h2>
      <ul className="recent-results">
        {fixtures.map((fixture) => {
          const fixtureEvents = events.filter((e) => e.fixture_id === fixture.id)
          const detailOpen = detailId === fixture.id
          const watchOpen = watchId === fixture.id
          const hasHighlights = Boolean(fixture.highlights_video_id)

          return (
            <li key={fixture.id} className="recent-result">
              <button
                type="button"
                className="recent-result__summary"
                onClick={() => setDetailId(detailOpen ? null : fixture.id)}
                aria-expanded={detailOpen}
              >
                <span className="recent-result__team">
                  <TeamCrest src={fixture.home_logo} name={fixture.home_team} />
                  {fixture.home_team}
                </span>
                <span className="recent-result__score">{fixture.home_score} - {fixture.away_score}</span>
                <span className="recent-result__team">
                  <TeamCrest src={fixture.away_logo} name={fixture.away_team} />
                  {fixture.away_team}
                </span>
              </button>

              {hasHighlights && (
                <button
                  type="button"
                  className="recent-result__highlights"
                  onClick={() => setWatchId(watchOpen ? null : fixture.id)}
                  aria-expanded={watchOpen}
                >
                  {watchOpen ? 'Hide highlights' : '▶ Highlights'}
                </button>
              )}

              {watchOpen && hasHighlights && (
                <LiveStreamEmbed videoId={fixture.highlights_video_id} title={`${fixture.home_team} v ${fixture.away_team} highlights`} />
              )}

              {detailOpen && (
                <ul className="recent-result__events">
                  {fixtureEvents.length === 0 && <li className="auth-note">Match details not available.</li>}
                  {fixtureEvents.map((ev) => (
                    <li key={ev.id}>
                      <span className="reporter-event__minute">{ev.minute}'</span>
                      {ev.type === 'goal' &&
                        `${ev.team === 'home' ? fixture.home_team : fixture.away_team} — ${ev.player_name}${ev.assist_name ? ` (assist: ${ev.assist_name})` : ''}`}
                      {ev.type === 'card' &&
                        `${ev.card_type === 'red' ? 'Red' : 'Yellow'} card — ${ev.player_name} (${ev.team === 'home' ? fixture.home_team : fixture.away_team})`}
                      {ev.type === 'missed_penalty' &&
                        `Missed penalty — ${ev.player_name} (${ev.team === 'home' ? fixture.home_team : fixture.away_team})`}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
