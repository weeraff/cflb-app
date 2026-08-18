import TeamCrest from './TeamCrest'
import { FormGuide } from './CompetitionReference'
import { computeForm, findStandingPosition } from '../lib/form'

// A trimmed-down alternative to the full CompetitionReference (ladder +
// results + top scorers) for the Predictions page specifically — just
// enough (position, last-5 form) to inform a pick, for exactly the round's
// 8 fixtures rather than every team in all three competitions. The full
// reference already lives on Home; this isn't meant to duplicate it, just
// cover what's actually useful mid-pick without leaving the page.
function TeamFormRow({ name, logo, competition, standings, results }) {
  const position = findStandingPosition(name, standings, competition)
  return (
    <div className="compact-form-guide__team">
      <TeamCrest src={logo} name={name} size="sm" />
      <span className="compact-form-guide__name">{name}</span>
      {position && <span className="compact-form-guide__position">{position}</span>}
      <FormGuide picks={computeForm(name, results, competition)} />
    </div>
  )
}

export default function CompactFormGuide({ fixtures, standings, results }) {
  if (fixtures.length === 0) return null

  return (
    <div className="compact-form-guide">
      {fixtures.map((fixture) => (
        <div key={fixture.id} className="compact-form-guide__fixture">
          <span className="compact-form-guide__competition">{fixture.competition}</span>
          <TeamFormRow name={fixture.home_team} logo={fixture.home_logo} competition={fixture.competition} standings={standings} results={results} />
          <TeamFormRow name={fixture.away_team} logo={fixture.away_logo} competition={fixture.competition} standings={standings} results={results} />
        </div>
      ))}
    </div>
  )
}
