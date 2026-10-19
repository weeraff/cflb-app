import { describe, expect, it } from 'vitest'
import { savePending, loadPending, clearPending } from './pendingSignup'
import { CONSENT_VERSION, consentFields } from './consent'
import { crestFor } from './crests'
import { isInAppBrowser } from './inAppBrowser'
import { generateLeagueCode, joinUrl } from './leagueCode'
import { toCsv } from './csv'
import { formatKickoff } from './format'

function memoryStorage() {
  const data = new Map()
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  }
}

describe('pendingSignup', () => {
  it('saves, merges and clears', () => {
    const s = memoryStorage()
    savePending({ joinCode: 'ABC123' }, s)
    savePending({ picks: { a: { home: 1, away: 0 } }, jokerId: 'a', optIn: true }, s)
    const p = loadPending(s)
    expect(p.joinCode).toBe('ABC123')
    expect(p.jokerId).toBe('a')
    expect(p.optIn).toBe(true)
    clearPending(s)
    expect(loadPending(s)).toBeNull()
  })
  it('expires after 7 days', () => {
    const s = memoryStorage()
    s.setItem('cflb-pending-signup', JSON.stringify({ picks: {}, savedAt: Date.now() - 8 * 86400000 }))
    expect(loadPending(s)).toBeNull()
  })
  it('survives corrupt or unavailable storage', () => {
    const s = memoryStorage()
    s.setItem('cflb-pending-signup', '{not json')
    expect(loadPending(s)).toBeNull()
    const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => {} }
    expect(() => savePending({ a: 1 }, broken)).not.toThrow()
    expect(loadPending(broken)).toBeNull()
  })
})

describe('consentFields', () => {
  it('records choice, time and wording version', () => {
    const now = new Date('2026-10-19T00:00:00Z')
    expect(consentFields(true, now)).toEqual({ marketing_opt_in: true, consent_at: '2026-10-19T00:00:00.000Z', consent_version: CONSENT_VERSION })
    expect(consentFields(false, now).marketing_opt_in).toBe(false)
  })
})

describe('crestFor', () => {
  it('matches the feed names used in different rounds', () => {
    expect(crestFor('Preston Lions FC')).toBe(crestFor('Preston Lions'))
    expect(crestFor('Sydney United 58 FC')).toMatch(/Sydney_United/)
    expect(crestFor('Lions FC')).toMatch(/lions_fc/)
    expect(crestFor('Sutherland Sharks')).toMatch(/sharksfc/)
  })
  it('returns null for unknown teams so the monogram fallback shows', () => {
    expect(crestFor('Made Up United')).toBeNull()
    expect(crestFor(undefined)).toBeNull()
  })
})

describe('isInAppBrowser', () => {
  it('detects Instagram and Facebook webviews', () => {
    expect(isInAppBrowser('Mozilla/5.0 (iPhone) AppleWebKit Instagram 300.0')).toBe(true)
    expect(isInAppBrowser('Mozilla/5.0 (Linux; Android) [FBAN/FB4A;FBAV/400.0]')).toBe(true)
    expect(isInAppBrowser('Mozilla/5.0 (iPhone) Version/17.0 Mobile Safari/604.1')).toBe(false)
  })
})

describe('leagueCode', () => {
  it('makes 6-character codes from unambiguous characters', () => {
    for (let i = 0; i < 50; i++) expect(generateLeagueCode()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)
  })
  it('builds the join link', () => {
    expect(joinUrl('ABC123', 'https://cflb.app')).toBe('https://cflb.app/join/ABC123')
  })
})

describe('toCsv', () => {
  it('writes a header and escapes commas, quotes and newlines', () => {
    const csv = toCsv([{ name: 'Smith, J', note: 'said "hi"', other: 'a\nb' }])
    expect(csv).toBe('name,note,other\r\n"Smith, J","said ""hi""","a\nb"\r\n')
  })
  it('neutralises spreadsheet formulas', () => {
    expect(toCsv([{ name: '=HYPERLINK("x")' }])).toBe('name\r\n"\'=HYPERLINK(""x"")"\r\n')
  })
  it('handles no rows', () => {
    expect(toCsv([], ['email'])).toBe('email\r\n')
  })
})

describe('formatKickoff', () => {
  it('formats in the given time zone', () => {
    expect(formatKickoff('2026-10-22T08:30:00Z', 'Australia/Sydney')).toBe('Thu 22 Oct, 7:30pm')
    expect(formatKickoff('2026-10-22T08:30:00Z', 'Australia/Perth')).toBe('Thu 22 Oct, 4:30pm')
  })
})
