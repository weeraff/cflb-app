import { CardIcon, GoalIcon, MissedPenaltyIcon } from './MatchEventIcon'

// Shared by LiveScoreStrip and CompetitionReference's match-detail
// dropdown so a goal/card/missed-penalty reads identically everywhere.
export default function MatchEventRow({ event, homeTeam, awayTeam }) {
  const teamName = event.team === 'home' ? homeTeam : awayTeam

  return (
    <li className="match-event-row">
      {event.type === 'goal' && <GoalIcon />}
      {event.type === 'card' && <CardIcon color={event.card_type} />}
      {event.type === 'missed_penalty' && <MissedPenaltyIcon />}
      <span className="match-event-row__minute">{event.minute}'</span>
      <span className="match-event-row__text">
        {event.type === 'goal' && (
          <>
            {event.player_name} <span className="match-event-row__team">({teamName})</span>
            {event.assist_name && <span className="match-event-row__assist"> — assist: {event.assist_name}</span>}
          </>
        )}
        {event.type === 'card' && (
          <>
            {event.player_name} <span className="match-event-row__team">({teamName})</span>
          </>
        )}
        {event.type === 'missed_penalty' && (
          <>
            Missed penalty — {event.player_name} <span className="match-event-row__team">({teamName})</span>
          </>
        )}
      </span>
    </li>
  )
}
