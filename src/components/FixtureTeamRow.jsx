import TeamCrest from './TeamCrest'

// Shared crest+name shape used everywhere a fixture lists its two teams
// (MyTeamDashboard, MatchdayBanner, GamesComingUp, LiveScoreStrip,
// CompetitionReference, PredictionsPage). Any score renders as a sibling
// alongside this, not inside it — every call site already did that, this
// just removes the repeated <TeamCrest/> + name markup, not the layout
// around it, which varies deliberately by context.
export default function FixtureTeamRow({ logo, name, className, tag = 'span', nameClassName, crestSize }) {
  const Tag = tag
  return (
    <Tag className={className}>
      <TeamCrest src={logo} name={name} size={crestSize} />
      {nameClassName ? <span className={nameClassName}>{name}</span> : name}
    </Tag>
  )
}
