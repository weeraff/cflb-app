import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { COMPETITIONS, placeholderStandings, placeholderResults } from '../lib/placeholderData'

const COMPETITION_LABELS = {
  'NPL NSW': 'NPL NSW',
  'League One': 'Football NSW League One',
  'League Two': 'Football NSW League Two',
}

export default function TablePage() {
  const [standings, setStandings] = useState(placeholderStandings)
  const [results, setResults] = useState(placeholderResults)
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
  }, [])

  const rows = standings
    .filter((row) => row.competition === activeCompetition)
    .sort((a, b) => a.position - b.position)

  const recentResults = results
    .filter((row) => row.competition === activeCompetition)
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
              <td>{row.team}</td>
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

      <h2 className="results-heading">Recent Results</h2>
      <ul className="results-list">
        {recentResults.map((r) => (
          <li key={r.id ?? `${r.home_team}-${r.away_team}-${r.played_at}`} className="result-row">
            <span className="result-row__round">{r.round}</span>
            <span className="result-row__match">
              <span className={r.home_score > r.away_score ? 'result-row__winner' : ''}>{r.home_team}</span>
              <span className="result-row__score">{r.home_score} - {r.away_score}</span>
              <span className={r.away_score > r.home_score ? 'result-row__winner' : ''}>{r.away_team}</span>
            </span>
            {r.ground && <span className="result-row__ground">{r.ground}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
