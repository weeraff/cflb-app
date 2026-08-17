// Small inline SVGs so match events read at a glance instead of as plain
// text — a football for goals, a card-shaped rectangle in the right
// colour for bookings. No icon library in this project; these are the
// only two shapes needed, hand-rolled matches how TeamCrest already
// generates its own badges rather than pulling in a dependency for it.
export function GoalIcon() {
  return (
    <svg className="match-event-icon match-event-icon--goal" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="var(--text)" />
      <path
        d="M12 6.5 15.5 9l-1.3 4h-4.4L8.5 9zM12 6.5V3M8.2 9l-3.4-1M15.8 9l3.4-1M10.2 13l-2 3M13.8 13l2 3"
        fill="none"
        stroke="var(--bg)"
        strokeWidth="1.1"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function CardIcon({ color }) {
  return (
    <svg
      className={`match-event-icon match-event-icon--card match-event-icon--card-${color}`}
      viewBox="0 0 16 20"
      width="12"
      height="16"
      aria-hidden="true"
    >
      <rect x="0.5" y="0.5" width="15" height="19" rx="2" fill={color === 'red' ? '#e5484d' : '#ffc233'} stroke="rgba(0,0,0,0.25)" />
    </svg>
  )
}

export function MissedPenaltyIcon() {
  return (
    <svg className="match-event-icon match-event-icon--missed" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" />
      <path d="M8 8l8 8M16 8l-8 8" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
