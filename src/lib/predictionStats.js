// Derives "addictive" consistency stats from a user's full prediction
// history — no fixtures join needed, since predictions already store the
// pick (home/away_score_pick) and the outcome (points_awarded, set once a
// fixture is scored).

function pickSide(home, away) {
  if (home > away) return 'home'
  if (home < away) return 'away'
  return 'draw'
}

const RECENT_WINDOW = 14

export function computePredictionStats(predictions) {
  const scored = predictions
    .filter((p) => p.points_awarded != null)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const recent = scored.slice(0, RECENT_WINDOW)

  const bySide = {
    home: { correct: 0, total: 0 },
    away: { correct: 0, total: 0 },
    draw: { correct: 0, total: 0 },
  }
  let exactCount = 0

  for (const p of scored) {
    const side = pickSide(p.home_score_pick, p.away_score_pick)
    bySide[side].total += 1
    if (p.points_awarded > 0) bySide[side].correct += 1
    if (p.points_awarded === 3) exactCount += 1
  }

  return {
    recentRecord:
      recent.length > 0
        ? { correct: recent.filter((p) => p.points_awarded > 0).length, total: recent.length }
        : null,
    bySide,
    exactRate: scored.length > 0 ? Math.round((exactCount / scored.length) * 100) : null,
    totalScored: scored.length,
  }
}
