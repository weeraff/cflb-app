import { useState } from 'react'
import { COMPETITIONS } from '../lib/placeholderData'
import { computeForm } from '../lib/form'
import TeamCrest from './TeamCrest'
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

      <h3 className="results-heading">Recent Results</h3>
      <ul className="results-list">
        {recentResults.map((r) => (
          <li key={r.id ?? `${r.home_team}-${r.away_team}-${r.played_at}`} className="result-row">
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
          </li>
        ))}
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
