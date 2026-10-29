import { describe, expect, it } from 'vitest'
import { reminderKind, buildReminderEmail, sydneyHour } from './reminders'

// Round 3 locks Thu 29 Oct 2026, 7:30pm AEDT = 08:30 UTC.
const lock = new Date('2026-10-29T08:30:00Z')
const at = (iso: string) => new Date(iso)

describe('reminderKind', () => {
  it('sends the night-before reminder about 24 hours out', () => {
    expect(reminderKind(lock, at('2026-10-28T08:35:00Z'))).toBe('day-before') // Wed 7:35pm
    expect(reminderKind(lock, at('2026-10-28T06:35:00Z'))).toBe('day-before') // 26h out
  })
  it('sends the lock-day reminder in the morning', () => {
    expect(reminderKind(lock, at('2026-10-28T22:35:00Z'))).toBe('lock-day') // Thu 9:35am
    expect(reminderKind(lock, at('2026-10-29T02:35:00Z'))).toBe('lock-day') // Thu 1:35pm, 6h out
  })
  it('stays quiet outside the windows', () => {
    expect(reminderKind(lock, at('2026-10-27T08:35:00Z'))).toBeNull() // 2 days out
    expect(reminderKind(lock, at('2026-10-29T05:35:00Z'))).toBeNull() // 3h out, too late to nag
    expect(reminderKind(lock, at('2026-10-29T09:00:00Z'))).toBeNull() // already locked
  })
  it('never emails overnight, even inside a window', () => {
    // Round locking 3pm Sat AEDT (04:00Z): morning window would start at 5am.
    const satLock = new Date('2026-11-07T04:00:00Z')
    expect(reminderKind(satLock, at('2026-11-06T18:30:00Z'))).toBeNull() // 5:30am Sydney
    expect(reminderKind(satLock, at('2026-11-06T21:05:00Z'))).toBe('lock-day') // 8:05am Sydney
  })
})

describe('sydneyHour', () => {
  it('reads the hour in Sydney time', () => {
    expect(sydneyHour(at('2026-10-28T22:35:00Z'))).toBe(9)
  })
})

describe('buildReminderEmail', () => {
  const base = {
    displayName: 'Jamie',
    roundName: 'Round 3',
    lock,
    rank: 5,
    points: 14,
    picksUrl: 'https://play.champagnefootball.com.au/',
    unsubscribeUrl: 'https://example.com/unsub?u=1&t=abc',
  }
  it('day-before: says tomorrow, rank, Joker and the lock time', () => {
    const e = buildReminderEmail({ ...base, kind: 'day-before' })
    expect(e.subject).toBe('Round 3 locks tomorrow at 7:30pm')
    expect(e.text).toContain('Jamie')
    expect(e.text).toContain('5th on 14 points')
    expect(e.text).toContain('Joker')
    expect(e.text).toContain(base.unsubscribeUrl)
    expect(e.html).toContain(base.picksUrl)
  })
  it('lock-day: says tonight', () => {
    const e = buildReminderEmail({ ...base, kind: 'lock-day' })
    expect(e.subject).toBe('Round 3 locks tonight at 7:30pm')
  })
  it('handles players with no points yet', () => {
    const e = buildReminderEmail({ ...base, kind: 'day-before', rank: null, points: 0 })
    expect(e.text).not.toContain('0th')
    expect(e.text).toMatch(/plenty of time/i)
  })
  it('uses the right ordinal suffixes', () => {
    expect(buildReminderEmail({ ...base, kind: 'day-before', rank: 1 }).text).toContain('1st on')
    expect(buildReminderEmail({ ...base, kind: 'day-before', rank: 2 }).text).toContain('2nd on')
    expect(buildReminderEmail({ ...base, kind: 'day-before', rank: 11 }).text).toContain('11th on')
    expect(buildReminderEmail({ ...base, kind: 'day-before', rank: 23 }).text).toContain('23rd on')
  })
  it('escapes names in the HTML version', () => {
    const e = buildReminderEmail({ ...base, kind: 'day-before', displayName: '<b>Gaz</b>' })
    expect(e.html).not.toContain('<b>Gaz</b>')
    expect(e.html).toContain('&lt;b&gt;Gaz&lt;/b&gt;')
  })
  it('never uses an em dash', () => {
    for (const kind of ['day-before', 'lock-day'] as const) {
      const e = buildReminderEmail({ ...base, kind })
      expect(e.subject + e.text + e.html).not.toContain('—')
    }
  })
})
