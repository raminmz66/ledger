import { describe, expect, it } from 'vitest'
import { validateName, validateTransaction } from './validation'

describe('validateName', () => {
  it('trims, strips invisible edge characters, normalizes Arabic letters, keeps inner ZWNJ', () => {
    expect(validateName('  علي ')).toEqual({ ok: true, value: 'علی' })
    expect(validateName('‏ می‌ماند ‌')).toEqual({ ok: true, value: 'می‌ماند' })
  })
  it('rejects empty, whitespace/invisible-only and over-60 names; accepts exactly 60', () => {
    for (const bad of ['', '   ', '‌', 'x'.repeat(61)]) {
      expect(validateName(bad)).toEqual({ ok: false, error: 'invalid_name' })
    }
    expect(validateName('x'.repeat(60)).ok).toBe(true)
  })
})

const base = { direction: 'paid' as const, amount: '2500000', date: '2026-10-06', note: '' }

describe('validateTransaction', () => {
  it('accepts a valid transaction; empty note becomes null; note is cleaned', () => {
    expect(validateTransaction(base)).toEqual({
      ok: true,
      value: { direction: 'paid', amount: 2_500_000, date: '2026-10-06', note: null },
    })
    expect(validateTransaction({ ...base, note: '  كتاب ' })).toMatchObject({ ok: true, value: { note: 'کتاب' } })
  })
  it('rejects empty, zero and over-limit amounts', () => {
    for (const amount of ['', '0', '1000000000001']) {
      expect(validateTransaction({ ...base, amount })).toEqual({ ok: false, error: 'invalid_amount' })
    }
    expect(validateTransaction({ ...base, amount: '1000000000000' }).ok).toBe(true)
    expect(validateTransaction({ ...base, amount: '1' }).ok).toBe(true)
  })
  it('rejects impossible dates and over-200 notes', () => {
    expect(validateTransaction({ ...base, date: '2026-02-30' })).toEqual({ ok: false, error: 'invalid_date' })
    expect(validateTransaction({ ...base, date: '' })).toEqual({ ok: false, error: 'invalid_date' })
    expect(validateTransaction({ ...base, note: 'x'.repeat(201) })).toEqual({ ok: false, error: 'invalid_note' })
    expect(validateTransaction({ ...base, note: 'x'.repeat(200) }).ok).toBe(true)
  })
})
