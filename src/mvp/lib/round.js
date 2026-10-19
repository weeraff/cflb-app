// Pure pick/round logic for the MVP predictor. No Supabase or React in
// here so it can be unit tested directly.

export const COMPETITION = 'Australian Championship'
const MAX_SCORE = 15

export function roundFixtures(fixtures) {
  return fixtures
    .filter((fx) => fx.featured && fx.competition === COMPETITION)
    .sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at))
}

// The whole round locks at its first kickoff. The database enforces the
// same rule (current_round_lock()), this just mirrors it for the UI.
export function roundLockTime(fixtures) {
  if (fixtures.length === 0) return null
  return new Date(Math.min(...fixtures.map((fx) => new Date(fx.kickoff_at).getTime())))
}

export function isRoundLocked(fixtures, now = new Date()) {
  const lock = roundLockTime(fixtures)
  return lock ? now >= lock : true
}

function isPickComplete(pick) {
  return Number.isInteger(pick?.home) && Number.isInteger(pick?.away)
}

export function countPicked(fixtures, picks) {
  return fixtures.filter((fx) => isPickComplete(picks[fx.id])).length
}

export function allPicked(fixtures, picks) {
  return fixtures.length > 0 && countPicked(fixtures, picks) === fixtures.length
}

// From blank: plus means "they score one", minus means "nil".
export function stepScore(value, delta) {
  if (value == null) return delta > 0 ? 1 : 0
  return Math.min(MAX_SCORE, Math.max(0, value + delta))
}

export function toggleJoker(currentId, fixtureId) {
  return currentId === fixtureId ? null : fixtureId
}

// Picks restored from storage may belong to a round that's since moved on.
export function filterPicksToRound(fixtures, picks, jokerId) {
  const ids = new Set(fixtures.map((fx) => fx.id))
  const kept = Object.fromEntries(Object.entries(picks ?? {}).filter(([id]) => ids.has(id)))
  return { picks: kept, jokerId: ids.has(jokerId) ? jokerId : null }
}

export function toPredictionRows(userId, fixtures, picks, jokerId) {
  return fixtures.map((fx) => ({
    user_id: userId,
    fixture_id: fx.id,
    home_score_pick: picks[fx.id].home,
    away_score_pick: picks[fx.id].away,
    is_joker: fx.id === jokerId,
  }))
}

export function picksFromPredictions(rows) {
  const picks = {}
  const points = {}
  let jokerId = null
  for (const row of rows) {
    picks[row.fixture_id] = { home: row.home_score_pick, away: row.away_score_pick }
    points[row.fixture_id] = row.points_awarded ?? null
    if (row.is_joker) jokerId = row.fixture_id
  }
  return { picks, jokerId, points }
}

export function pointsLabel(points) {
  if (points == null) return ''
  return points > 0 ? `+${points}` : '0 pts'
}

export function isLockError(error) {
  if (!error) return false
  return error.code === '42501' || /row-level security/i.test(error.message ?? '')
}
