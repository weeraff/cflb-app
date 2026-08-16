import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { COMPETITIONS } from '../lib/placeholderData'
import { computeForm } from '../lib/form'
import TeamCrest from './TeamCrest'
import LiveStreamEmbed from './LiveStreamEmbed'
import useCompetitionData from '../hooks/useCompetitionData'

const COMPETITION_LABELS = {
  'NPL NSW': 'NPL NSW',
  'League One': 'Football NSW League One',
  'League Two': 'Football NSW League Two',
}

export function FormGuide({ picks }) {
  if (picks.length === 0) return <span className="form-guide form-guide--empty">—</span>
  return (
    <span className="form-guide">
      {picks.map((result, i) => (
        <span key={i} className={`form-guide__pip form-guide__pip--${result.toLowerCase()}`} aria-label={result} title={result}>
          {result}
        </span>
      ))}
    </span>
  )
}

export default function CompetitionReference({ heading = 'Form Guide' }) {
  const { standings, results, topScorers, usingPlaceholder } = useCompetitionData()
  const [activeCompetition, setActiveCompetition] = useState(COMPETITIONS[0])
  const [streamData, setStreamData] = useState({})
  const [events, setEvents] = useState([])
  const [detailId, setDetailId] = useState(null)
  const [watchId, setWatchId] = useState(null)

  const rows = standings
    .filter((row) => row.competition === activeCompetition)
    .sort((a, b) => a.position - b.position)

  // Results only ever get a round number within their own competition, so
  // "last round" has to be resolved per competition, not globally — the
  // freshest round for whichever tier is selected, not just the most
  // recent result across all three.
  const competitionResults = results
    .filter((row) => row.competition === activeCompetition)
    .sort((a, b) => new Date(b.played_at) - new Date(a.played_at))
  const lastRound = competitionResults[0]?.round
  const recentResults = lastRound ? competitionResults.filter((r) => r.round === lastRound) : []

  // Watch/highlights/match-detail only ever apply to NPL NSW (the only
  // tier Football NSW streams), sourced from `fixtures` — `results` is a
  // separate all-three-competitions mirror with no stream/highlights
  // columns of its own, joined here by the dribl_id the two tables share.
  useEffect(() => {
    if (!isSupabaseConfigured || activeCompetition !== 'NPL NSW' || recentResults.length === 0) {
      setStreamData({})
      setEvents([])
      return
    }

    const driblIds = recentResults.map((r) => r.dribl_id).filter(Boolean)
    if (driblIds.length === 0) return

    supabase
      .from('fixtures')
      .select('id, dribl_id, stream_status, youtube_video_id, highlights_video_id')
      .in('dribl_id', driblIds)
      .then(({ data, error }) => {
        if (error || !data) return
        const byDriblId = Object.fromEntries(data.map((f) => [f.dribl_id, f]))
        setStreamData(byDriblId)

        const fixtureIds = data.map((f) => f.id)
        if (fixtureIds.length === 0) return
        supabase
          .from('match_events')
          .select('*')
          .in('fixture_id', fixtureIds)
          .order('minute', { ascending: true })
          .then(({ data: eventRows, error: eventsError }) => {
            if (!eventsError && eventRows) setEvents(eventRows)
          })
      })
  }, [activeCompetition, lastRound])

  const scorers = topScorers
    .filter((row) => row.competition === activeCompetition)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5)

  return (
    <div className="competition-reference">
      {heading && <h2>{heading}</h2>}
      <p className="section-subtitle">
        Live tables, results and scorers from Football NSW, standing in as a beta test before the Australian Championship kicks off on 17 October.
        {usingPlaceholder && ' (showing sample standings until the source is connected)'}
      </p>

      <label className="competition-select-label" htmlFor="competition-select">
        Competition
      </label>
      <select
        id="competition-select"
        className="competition-select"
        value={activeCompetition}
        onChange={(e) => setActiveCompetition(e.target.value)}
      >
        {COMPETITIONS.map((name) => (
          <option key={name} value={name}>
            {COMPETITION_LABELS[name] ?? name}
          </option>
        ))}
      </select>

      <div className="table-scroll">
        <table className="standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>P</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>GD</th>
              <th>Pts</th>
              <th>Form</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const zone =
                row.position === 1
                  ? 'zone--leader'
                  : row.position > rows.length - 2
                    ? 'zone--relegation'
                    : ''
              return (
                <tr key={row.team} className={zone}>
                  <td>{row.position}</td>
                  <td>
                    <span className="standings-table__team">
                      <TeamCrest src={row.logo_url} name={row.team} />
                      {row.team}
                    </span>
                  </td>
                  <td>{row.played}</td>
                  <td>{row.won}</td>
                  <td>{row.drawn}</td>
                  <td>{row.lost}</td>
                  <td>{row.gd}</td>
                  <td><strong>{row.points}</strong></td>
                  <td><FormGuide picks={computeForm(row.team, results, activeCompetition)} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="table-legend">
        <span className="table-legend__item">
          <span className="table-legend__swatch table-legend__swatch--leader" />
          Champion
        </span>
        <span className="table-legend__item">
          <span className="table-legend__swatch table-legend__swatch--relegation" />
          Relegation
        </span>
        <span className="table-legend__item">
          <span className="form-guide__pip form-guide__pip--w form-guide__pip--legend" />
          Win
        </span>
        <span className="table-legend__item">
          <span className="form-guide__pip form-guide__pip--d form-guide__pip--legend" />
          Draw
        </span>
        <span className="table-legend__item">
          <span className="form-guide__pip form-guide__pip--l form-guide__pip--legend" />
          Loss
        </span>
      </div>

      <h3 className="results-heading">Recent Results{lastRound ? ` — ${lastRound}` : ''}</h3>
      <ul className="results-list">
        {recentResults.map((r) => {
          const key = r.id ?? `${r.home_team}-${r.away_team}-${r.played_at}`
          const fixture = streamData[r.dribl_id]
          const fixtureEvents = fixture ? events.filter((e) => e.fixture_id === fixture.id) : []
          const detailOpen = detailId === key
          const watchOpen = watchId === key
          const hasHighlights = Boolean(fixture?.highlights_video_id)

          return (
            <li key={key} className="result-row result-row--interactive">
              <button
                type="button"
                className="result-row__toggle"
                onClick={() => setDetailId(detailOpen ? null : key)}
                disabled={!fixture}
                aria-expanded={detailOpen}
              >
                <span className="result-row__round">{r.round}</span>
                <span className="result-row__match">
                  <span className={`result-row__team${r.home_score > r.away_score ? ' result-row__winner' : ''}`}>
                    <TeamCrest src={r.home_logo} name={r.home_team} />
                    <span className="result-row__team-name">{r.home_team}</span>
                  </span>
                  <span className="result-row__score">{r.home_score} - {r.away_score}</span>
                  <span className={`result-row__team${r.away_score > r.home_score ? ' result-row__winner' : ''}`}>
                    <TeamCrest src={r.away_logo} name={r.away_team} />
                    <span className="result-row__team-name">{r.away_team}</span>
                  </span>
                </span>
                {r.ground && <span className="result-row__ground">{r.ground}</span>}
              </button>

              {hasHighlights && (
                <button
                  type="button"
                  className="recent-result__highlights"
                  onClick={() => setWatchId(watchOpen ? null : key)}
                  aria-expanded={watchOpen}
                >
                  {watchOpen ? 'Hide highlights' : '▶ Highlights'}
                </button>
              )}

              {watchOpen && hasHighlights && (
                <LiveStreamEmbed videoId={fixture.highlights_video_id} title={`${r.home_team} v ${r.away_team} highlights`} />
              )}

              {detailOpen && (
                <ul className="recent-result__events">
                  {fixtureEvents.length === 0 && <li className="auth-note">Match details not available.</li>}
                  {fixtureEvents.map((ev) => (
                    <li key={ev.id}>
                      <span className="reporter-event__minute">{ev.minute}'</span>
                      {ev.type === 'goal' &&
                        `${ev.team === 'home' ? r.home_team : r.away_team} — ${ev.player_name}${ev.assist_name ? ` (assist: ${ev.assist_name})` : ''}`}
                      {ev.type === 'card' &&
                        `${ev.card_type === 'red' ? 'Red' : 'Yellow'} card — ${ev.player_name} (${ev.team === 'home' ? r.home_team : r.away_team})`}
                      {ev.type === 'missed_penalty' &&
                        `Missed penalty — ${ev.player_name} (${ev.team === 'home' ? r.home_team : r.away_team})`}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>

      <h3 className="results-heading">Top Scorers</h3>
      <ol className="scorers-list">
        {scorers.map((s) => (
          <li key={s.id ?? s.player_name} className="scorer-row">
            {s.image_url ? (
              <img className="scorer-row__photo" src={s.image_url} alt="" loading="lazy" />
            ) : (
              <span className="scorer-row__photo scorer-row__photo--placeholder" />
            )}
            <span className="scorer-row__name">{s.player_name}</span>
            <span className="scorer-row__club">{s.club_name}</span>
            <span className="scorer-row__goals">{s.goals}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
