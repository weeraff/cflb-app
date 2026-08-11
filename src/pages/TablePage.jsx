import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { COMPETITIONS, placeholderStandings, placeholderResults, placeholderTopScorers } from '../lib/placeholderData'
import TeamCrest from '../components/TeamCrest'

const COMPETITION_LABELS = {
  'NPL NSW': 'NPL NSW',
  'League One': 'Football NSW League One',
  'League Two': 'Football NSW League Two',
}

export default function TablePage() {
  const [standings, setStandings] = useState(placeholderStandings)
  const [results, setResults] = useState(placeholderResults)
  const [topScorers, setTopScorers] = useState(placeholderTopScorers)
  const [usingPlaceholder, setUsingPlaceholder] = useState(true)
  const [activeCompetition, setActiveCompetition] = useState(COMPETITIONS[0])

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase
      .from('standings')
      .select('*')
      .in('competition', COMPETITIONS)
      .order('position', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data?.length) {
          setStandings(data)
          setUsingPlaceholder(false)
        }
      })

    supabase
      .from('results')
      .select('*')
      .in('competition', COMPETITIONS)
      .order('played_at', { ascending: false })
      .limit(30)
      .then(({ data, error }) => {
        if (!error && data?.length) setResults(data)
      })

    supabase
      .from('top_scorers')
      .select('*')
      .in('competition', COMPETITIONS)
      .order('goals', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data?.length) setTopScorers(data)
      })
  }, [])

  const rows = standings
    .filter((row) => row.competition === activeCompetition)
    .sort((a, b) => a.position - b.position)

  const recentResults = results
    .filter((row) => row.competition === activeCompetition)
    .slice(0, 5)

  const scorers = topScorers
    .filter((row) => row.competition === activeCompetition)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5)

  return (
    <section>
      <h1>NPL Football</h1>
      <p className="section-subtitle">
        Live tables and results from Football NSW, standing in as a beta test before the Australian Championship kicks off on 17 October.
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
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.team} className={row.position === 1 ? 'zone--leader' : ''}>
                <td>{row.position}</td>
                <td>
                  <span className="standings-table__team">
                    <TeamCrest src={row.logo_url} />
                    {row.team}
                  </span>
                </td>
                <td>{row.played}</td>
                <td>{row.won}</td>
                <td>{row.drawn}</td>
                <td>{row.lost}</td>
                <td>{row.gd}</td>
                <td><strong>{row.points}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="results-heading">Recent Results</h2>
      <ul className="results-list">
        {recentResults.map((r) => (
          <li key={r.id ?? `${r.home_team}-${r.away_team}-${r.played_at}`} className="result-row">
            <span className="result-row__round">{r.round}</span>
            <span className="result-row__match">
              <span className={`result-row__team${r.home_score > r.away_score ? ' result-row__winner' : ''}`}>
                <TeamCrest src={r.home_logo} />
                <span className="result-row__team-name">{r.home_team}</span>
              </span>
              <span className="result-row__score">{r.home_score} - {r.away_score}</span>
              <span className={`result-row__team${r.away_score > r.home_score ? ' result-row__winner' : ''}`}>
                <TeamCrest src={r.away_logo} />
                <span className="result-row__team-name">{r.away_team}</span>
              </span>
            </span>
            {r.ground && <span className="result-row__ground">{r.ground}</span>}
          </li>
        ))}
      </ul>

      <h2 className="results-heading">Top Scorers</h2>
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
    </section>
  )
}
