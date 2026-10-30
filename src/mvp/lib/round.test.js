import { describe, expect, it } from 'vitest'
import {
  roundFixtures,
  roundLockTime,
  isRoundLocked,
  countPicked,
  allPicked,
  stepScore,
  toggleJoker,
  filterPicksToRound,
  toPredictionRows,
  picksFromPredictions,
  pointsLabel,
  isLockError,
  hasKickedOff,
  openFixtures,
  nextKickoff,
  isJokerLocked,
} from './round'

const f = (id, kickoff, extra = {}) => ({
  id,
  kickoff_at: kickoff,
  featured: true,
  competition: 'Australian Championship',
  ...extra,
})

const round = [
  f('b', '2026-10-23T08:30:00Z'),
  f('a', '2026-10-22T08:30:00Z'),
  f('c', '2026-10-24T04:00:00Z'),
]

describe('roundFixtures', () => {
  it('keeps featured Championship fixtures in kickoff order', () => {
    const mixed = [...round, f('npl', '2026-10-21T00:00:00Z', { competition: 'NPL NSW' }), f('x', '2026-10-21T00:00:00Z', { featured: false })]
    expect(roundFixtures(mixed).map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('per-game locking', () => {
  const afterFirst = new Date('2026-10-22T09:00:00Z') // game a has kicked off, b and c haven't
  it('locks each game at its own kickoff', () => {
    expect(hasKickedOff(round[1], new Date('2026-10-22T08:29:59Z'))).toBe(false)
    expect(hasKickedOff(round[1], new Date('2026-10-22T08:30:00Z'))).toBe(true)
  })
  it('lists the games still open, in kickoff order', () => {
    expect(openFixtures(roundFixtures(round), afterFirst).map((f) => f.id)).toEqual(['b', 'c'])
  })
  it('counts down to the next game still open', () => {
    expect(nextKickoff(round, afterFirst).toISOString()).toBe('2026-10-23T08:30:00.000Z')
    expect(nextKickoff(round, new Date('2026-12-01T00:00:00Z'))).toBeNull()
  })
  it('only locks the whole round once every game has started', () => {
    expect(isRoundLocked(round, afterFirst)).toBe(false)
    expect(isRoundLocked(round, new Date('2026-10-24T04:00:00Z'))).toBe(true)
    expect(isRoundLocked([])).toBe(true)
  })
  it('keeps the round start for reminders and the start-of-comp notice', () => {
    expect(roundLockTime(round).toISOString()).toBe('2026-10-22T08:30:00.000Z')
    expect(roundLockTime([])).toBeNull()
  })
  it('freezes the Joker once the game it is on has kicked off', () => {
    expect(isJokerLocked(round, 'a', afterFirst)).toBe(true)
    expect(isJokerLocked(round, 'b', afterFirst)).toBe(false)
    expect(isJokerLocked(round, null, afterFirst)).toBe(false)
  })
})

describe('countPicked / allPicked', () => {
  it('only counts picks with both scores', () => {
    const picks = { a: { home: 1, away: 0 }, b: { home: 2, away: null } }
    expect(countPicked(round, picks)).toBe(1)
    expect(allPicked(round, picks)).toBe(false)
  })
  it('uses the round size, not a fixed 8 (knockout rounds have fewer games)', () => {
    const final = [f('final', '2026-12-01T08:00:00Z')]
    expect(allPicked(final, { final: { home: 0, away: 0 } })).toBe(true)
  })
  it('never treats an empty round as complete', () => {
    expect(allPicked([], {})).toBe(false)
  })
})

describe('stepScore', () => {
  it('plus from blank means one goal, minus from blank means nil', () => {
    expect(stepScore(null, 1)).toBe(1)
    expect(stepScore(null, -1)).toBe(0)
  })
  it('steps within 0 to 15', () => {
    expect(stepScore(2, 1)).toBe(3)
    expect(stepScore(0, -1)).toBe(0)
    expect(stepScore(15, 1)).toBe(15)
  })
})

describe('toggleJoker', () => {
  it('sets, moves and clears the single joker', () => {
    expect(toggleJoker(null, 'a')).toBe('a')
    expect(toggleJoker('a', 'b')).toBe('b')
    expect(toggleJoker('b', 'b')).toBeNull()
  })
})

describe('filterPicksToRound', () => {
  it('drops picks and joker for fixtures no longer in the round', () => {
    const out = filterPicksToRound(round, { a: { home: 1, away: 1 }, old: { home: 3, away: 0 } }, 'old')
    expect(out).toEqual({ picks: { a: { home: 1, away: 1 } }, jokerId: null })
  })
})

describe('toPredictionRows / picksFromPredictions', () => {
  it('round-trips picks and joker', () => {
    const picks = { a: { home: 2, away: 1 }, b: { home: 0, away: 0 }, c: { home: 1, away: 3 } }
    const rows = toPredictionRows('u1', round, picks, 'b')
    expect(rows).toHaveLength(3)
    expect(rows.find((r) => r.fixture_id === 'b')).toEqual({ user_id: 'u1', fixture_id: 'b', home_score_pick: 0, away_score_pick: 0, is_joker: true })
    const back = picksFromPredictions(rows.map((r) => ({ ...r, points_awarded: r.fixture_id === 'a' ? 3 : null })))
    expect(back.picks).toEqual(picks)
    expect(back.jokerId).toBe('b')
    expect(back.points).toEqual({ a: 3, b: null, c: null })
  })
})

describe('pointsLabel', () => {
  it('formats awarded points', () => {
    expect(pointsLabel(null)).toBe('')
    expect(pointsLabel(0)).toBe('0 pts')
    expect(pointsLabel(6)).toBe('+6')
  })
})

describe('isLockError', () => {
  it('recognises a row-level-security rejection as the round being locked', () => {
    expect(isLockError({ code: '42501' })).toBe(true)
    expect(isLockError({ message: 'new row violates row-level security policy for table "predictions"' })).toBe(true)
    expect(isLockError({ code: '23505' })).toBe(false)
    expect(isLockError(null)).toBe(false)
  })
})
