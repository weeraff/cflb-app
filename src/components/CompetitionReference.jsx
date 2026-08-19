import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { COMPETITIONS } from '../lib/placeholderData'
import { computeForm } from '../lib/form'
import TeamCrest from './TeamCrest'
import FixtureTeamRow from './FixtureTeamRow'
import LiveStreamEmbed from './LiveStreamEmbed'
import MatchEventRow from './MatchEventRow'
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
  const [lineups, setLineups] = useState({})
  const [watchId, setWatchId] = useState(null)
  const [lineupId, setLineupId] = useState(null)

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
      setLineups({})
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

        supabase
          .from('match_lineups')
          .select('*')
          .in('fixture_id', fixtureIds)
          .then(({ data: lineupRows, error: lineupsError }) => {
            if (lineupsError || !lineupRows) return
            const byFixture = {}
            for (const row of lineupRows) {
              byFixture[row.fixture_id] ??= {}
              byFixture[row.fixture_id][row.team] = row
            }
            setLineups(byFixture)
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

      <h3 className="results-heading">Recent Results{lastRound ? `: ${lastRound}` : ''}</h3>
      <ul className="results-list results-list--grid">
        {recentResults.map((r) => {
          const key = r.id ?? `${r.home_team}-${r.away_team}-${r.played_at}`
          const fixture = streamData[r.dribl_id]
          const fixtureEvents = fixture ? events.filter((e) => e.fixture_id === fixture.id) : []
          const homeEvents = fixtureEvents.filter((e) => e.team === 'home')
          const awayEvents = fixtureEvents.filter((e) => e.team === 'away')
          const fixtureLineups = fixture ? lineups[fixture.id] : null
          const watchOpen = watchId === key
          const lineupOpen = lineupId === key
          const hasHighlights = Boolean(fixture?.highlights_video_id)
          const hasLineups = Boolean(fixtureLineups?.home || fixtureLineups?.away)

          return (
            <li key={key} className="result-row result-row--interactive">
              <div className="result-row__meta">
                <span>{r.round}</span>
                {r.ground && <span>{r.ground}</span>}
              </div>
              <div className="result-row__matchup">
                <div className="result-row__side">
                  <FixtureTeamRow className="result-row__side-team" logo={r.home_logo} name={r.home_team} crestSize="lg" />
                  <span className={`result-row__side-score${r.home_score > r.away_score ? ' result-row__winner' : ''}`}>{r.home_score}</span>
                </div>
                {homeEvents.length > 0 && (
                  <ul className="recent-result__events">
                    {homeEvents.map((ev) => (
                      <MatchEventRow key={ev.id} event={ev} homeTeam={r.home_team} awayTeam={r.away_team} />
                    ))}
                  </ul>
                )}
                <div className="result-row__side">
                  <FixtureTeamRow className="result-row__side-team" logo={r.away_logo} name={r.away_team} crestSize="lg" />
                  <span className={`result-row__side-score${r.away_score > r.home_score ? ' result-row__winner' : ''}`}>{r.away_score}</span>
                </div>
                {awayEvents.length > 0 && (
                  <ul className="recent-result__events">
                    {awayEvents.map((ev) => (
                      <MatchEventRow key={ev.id} event={ev} homeTeam={r.home_team} awayTeam={r.away_team} />
                    ))}
                  </ul>
                )}
              </div>

              {(hasHighlights || hasLineups) && (
                <div className="result-row__actions">
                  {hasHighlights && (
                    <button
                      type="button"
                      className="recent-result__highlights"
                      onClick={() => setWatchId(watchOpen ? null : key)}
                      aria-expanded={watchOpen}
                    >
                      {watchOpen ? 'Hide highlights' : '▶ Watch Highlights'}
                    </button>
                  )}
                  {hasLineups && (
                    <button
                      type="button"
                      className="recent-result__highlights"
                      onClick={() => setLineupId(lineupOpen ? null : key)}
                      aria-expanded={lineupOpen}
                    >
                      {lineupOpen ? 'Hide lineups' : 'Lineups'}
                    </button>
                  )}
                </div>
              )}

              {watchOpen && hasHighlights && (
                <LiveStreamEmbed videoId={fixture.highlights_video_id} title={`${r.home_team} v ${r.away_team} highlights`} />
              )}

              {lineupOpen && hasLineups && (
                <div className="recent-result__lineups">
                  <div className="recent-result__lineup">
                    <strong>{r.home_team}</strong>
                    <p>{fixtureLineups?.home?.starting_xi || 'Not available'}</p>
                    {fixtureLineups?.home?.subs && <p className="auth-note">Subs: {fixtureLineups.home.subs}</p>}
                  </div>
                  <div className="recent-result__lineup">
                    <strong>{r.away_team}</strong>
                    <p>{fixtureLineups?.away?.starting_xi || 'Not available'}</p>
                    {fixtureLineups?.away?.subs && <p className="auth-note">Subs: {fixtureLineups.away.subs}</p>}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <h3 className="results-heading">Ladder</h3>
      <div className="table-scroll">
        <table className="standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>P</th>
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
                    : row.position <= 6
                      ? 'zone--finals'
                      : ''
              return (
                <tr key={row.team} className={zone}>
                  <td>{row.position}</td>
                  <td>
                    <span className="standings-table__team">
                      <TeamCrest src={row.logo_url} name={row.team} size="sm" />
                      {row.team}
                    </span>
                  </td>
                  <td>{row.played}</td>
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
          <span className="table-legend__swatch table-legend__swatch--finals" />
          Finals (Top 6)
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
