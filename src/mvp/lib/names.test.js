import { describe, expect, it } from 'vitest'
import { cleanName, isNameTakenError, nameWithSuffix, NAME_TAKEN_MESSAGE } from './names'

describe('cleanName', () => {
  it('trims, collapses spaces and caps length', () => {
    expect(cleanName('  Gaz   the   Gaffer ')).toBe('Gaz the Gaffer')
    expect(cleanName('x'.repeat(60))).toHaveLength(40)
  })
})

describe('isNameTakenError', () => {
  it('spots the unique-name violation only', () => {
    expect(isNameTakenError({ code: '23505', message: 'duplicate key value violates unique constraint "profiles_display_name_unique"' })).toBe(true)
    expect(isNameTakenError({ code: '23505', message: 'duplicate key value violates unique constraint "profiles_pkey"' })).toBe(false)
    expect(isNameTakenError({ code: '42501' })).toBe(false)
    expect(isNameTakenError(null)).toBe(false)
  })
})

describe('nameWithSuffix', () => {
  it('adds a short number and stays within 40 characters', () => {
    expect(nameWithSuffix('Jamie')).toMatch(/^Jamie \d{2,3}$/)
    expect(nameWithSuffix('y'.repeat(40)).length).toBeLessThanOrEqual(40)
  })
})

it('has a clear message', () => {
  expect(NAME_TAKEN_MESSAGE).toMatch(/taken/i)
})
