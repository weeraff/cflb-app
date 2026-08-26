// Points first, then most exact scores, then most correct-outcome picks —
// the same tiebreak order a football table uses (points, then goal
// difference, then goals scored): the more important stat breaks ties
// before the less important one.
export function sortLeaderboard(entries) {
  return [...entries].sort((a, b) =>
    (b.points - a.points) ||
    ((b.scores ?? 0) - (a.scores ?? 0)) ||
    ((b.outcomes ?? 0) - (a.outcomes ?? 0))
  )
}
