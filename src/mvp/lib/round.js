// Pure pick/round logic for the MVP predictor. No Supabase or React in
// here so it can be unit tested directly.

export const COMPETITION = 'Australian Championship'
const MAX_SCORE = 15

export function roundFixtures(fixtures) {
  return fixtures
    .filter((fx) => fx.featured && fx.competition === COMPETITION)
    .sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at))
}

// Each game locks at its own kickoff. The database enforces the same rule
// in the predictions policies; these mirror it for the UI. Time alone
// decides, not fixtures.status, which only changes when the sync runs.
export function hasKickedOff(fixture, now = new Date()) {
  return now >= new Date(fixture.kickoff_at)
}

export function openFixtures(fixtures, now = new Date()) {
  return fixtures.filter((fx) => !hasKickedOff(fx, now))
}

export function nextKickoff(fixtures, now = new Date()) {
  const open = openFixtures(fixtures, now)
  if (open.length === 0) return null
  return new Date(Math.min(...open.map((fx) => new Date(fx.kickoff_at).getTime())))
}

// The round's first kickoff: when the round starts, used by reminders and
// the start-of-comp notice. No longer when picks lock.
export function roundLockTime(fixtures) {
  if (fixtures.length === 0) return null
  return new Date(Math.min(...fixtures.map((fx) => new Date(fx.kickoff_at).getTime())))
}

// Nothing left to pick: every game has started.
export function isRoundLocked(fixtures, now = new Date()) {
  return openFixtures(fixtures, now).length === 0
}

// One Joker per round: once the game it's on has started it can't move.
export function isJokerLocked(fixtures, jokerId, now = new Date()) {
  const fixture = fixtures.find((fx) => fx.id === jokerId)
  return fixture ? hasKickedOff(fixture, now) : false
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
