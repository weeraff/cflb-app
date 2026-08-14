// "The Eight": 4 NPL NSW, 3 League One, 1 League Two, hand-curated via
// fixtures.featured. If a tier comes up short (bye round, postponement),
// the shortfall carries down to the next tier so the round still ships
// exactly 8 picks whenever there are enough fixtures across all tiers.
const COMPETITION_ORDER = ['NPL NSW', 'League One', 'League Two']
const BASE_QUOTA = { 'NPL NSW': 4, 'League One': 3, 'League Two': 1 }

export function buildTheEightFixtures(fixtures) {
  const selected = []
  let carry = 0

  for (const competition of COMPETITION_ORDER) {
    const quota = BASE_QUOTA[competition] + carry
    const inComp = fixtures
      .filter((f) => f.competition === competition)
      .sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at))
      .slice(0, quota)
    selected.push(...inComp)
    carry = Math.max(0, quota - inComp.length)
  }

  return selected
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
