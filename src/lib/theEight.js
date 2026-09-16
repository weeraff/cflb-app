// "The Eight" is now selected from the Australian Championship's featured
// fixtures. The server marks the eight fixtures for the active round; keep
// their display order stable by kickoff time.

export function buildTheEightFixtures(fixtures) {
  return fixtures
    .filter((fixture) => fixture.competition === 'Australian Championship')
    .sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at))
    .slice(0, 8)
}

// Rounds aren't modelled as their own entity, so the tiebreaker groups
// itself by the earliest kickoff date among that round's fixtures — stable
// for as long as the same 8 fixtures are featured that week.
export function computeRoundKey(fixtures) {
  if (fixtures.length === 0) return null
  const earliest = fixtures.reduce((min, f) => (new Date(f.kickoff_at) < new Date(min.kickoff_at) ? f : min))
  return new Date(earliest.kickoff_at).toISOString().slice(0, 10)
}

// Picks lock at kickoff of the round's first fixture (chronologically
// earliest, not necessarily first in the tier-grouped display order).
export function computeLockTime(fixtures) {
  if (fixtures.length === 0) return null
  const earliest = fixtures.reduce((min, f) => (new Date(f.kickoff_at) < new Date(min.kickoff_at) ? f : min))
  return new Date(earliest.kickoff_at)
}
