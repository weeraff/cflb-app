import TeamCrest from './TeamCrest'

function formatKickoff(iso) {
  return new Date(iso).toLocaleString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function pickResult(home, away) {
  if (home > away) return 'home'
  if (home < away) return 'away'
  return 'draw'
}

export default function ChampagneNineSummary({ fixtures, picks, onEdit, onSubmit, submitting, locked, resultStats }) {
  return (
    <div className="champagne-nine-summary">
      <ul className="champagne-nine-summary__list">
        {fixtures.map((fixture) => {
          const pick = picks[fixture.id]
          const home = pick?.home ?? 0
          const away = pick?.away ?? 0
          const stat = locked ? resultStats?.[fixture.id] : null

          return (
            <li key={fixture.id} className="champagne-nine-summary__row">
              <div className="champagne-nine-summary__match">
                <span className="champagne-nine-summary__competition">{fixture.competition}</span>
                <div className="champagne-nine-summary__teams">
                  <span className="champagne-nine-summary__team">
                    <TeamCrest src={fixture.home_logo} name={fixture.home_team} />
                    <span>{fixture.home_team}</span>
                  </span>
                  <span className="champagne-nine-summary__score">{home} - {away}</span>
                  <span className="champagne-nine-summary__team">
                    <TeamCrest src={fixture.away_logo} name={fixture.away_team} />
                    <span>{fixture.away_team}</span>
                  </span>
                </div>
                {locked && <span className="champagne-nine-summary__kickoff">{formatKickoff(fixture.kickoff_at)}</span>}
              </div>

              {locked ? (
                stat != null && (
                  <span className="champagne-nine-summary__stat">{stat}% picked the same result</span>
                )
              ) : (
                <button type="button" className="champagne-nine-summary__edit" onClick={() => onEdit(fixture.id)}>
                  Edit
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {!locked && (
        <button type="button" className="button champagne-nine-summary__submit" onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Champagne Nine'}
        </button>
      )}
    </div>
  )
}

export { pickResult }
