// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { MAX_AMOUNT, normalizePersian, parseName, parseTransaction } from './ledger-validate'

describe('normalizePersian', () => {
  it('maps Arabic ي and ك to Persian ی and ک', () => {
    expect(normalizePersian('علي كريمي')).toBe('علی کریمی')
  })
})

describe('parseName', () => {
  it('trims and normalizes', () => {
    expect(parseName('  علي  ')).toEqual({ ok: true, value: 'علی' })
  })
  it('rejects non-strings, empty/whitespace-only, and over 60 chars; accepts exactly 60', () => {
    for (const bad of [undefined, null, 5, '', '   ', 'a'.repeat(61)]) {
      expect(parseName(bad)).toEqual({ ok: false, error: 'invalid_name' })
    }
    expect(parseName('a'.repeat(60)).ok).toBe(true)
  })
})

const good = { direction: 'paid', amount: 2_500_000, date: '2026-10-06', note: 'قرض' }

describe('parseTransaction', () => {
  it('accepts a valid transaction and defaults the note to null', () => {
    expect(parseTransaction(good)).toEqual({ ok: true, value: { ...good } })
    expect(parseTransaction({ ...good, note: undefined })).toMatchObject({ ok: true, value: { note: null } })
    expect(parseTransaction({ ...good, note: '   ' })).toMatchObject({ ok: true, value: { note: null } })
  })
  it('trims and normalizes the note', () => {
    expect(parseTransaction({ ...good, note: '  كتاب  ' })).toMatchObject({ value: { note: 'کتاب' } })
  })
  it('rejects non-object bodies', () => {
    for (const bad of [null, undefined, 'x', 5, [], [good]]) {
      expect(parseTransaction(bad)).toEqual({ ok: false, error: 'invalid_body' })
    }
  })
  it('rejects bad directions', () => {
    for (const d of [undefined, 'PAID', 'gave', 1, null]) {
      expect(parseTransaction({ ...good, direction: d })).toEqual({ ok: false, error: 'invalid_direction' })
    }
  })
  it('rejects bad amounts: strings, floats, zero, negative, NaN, Infinity, too large; accepts the limits', () => {
    for (const a of ['100', 1.5, 0, -5, NaN, Infinity, MAX_AMOUNT + 1, undefined, null]) {
      expect(parseTransaction({ ...good, amount: a })).toEqual({ ok: false, error: 'invalid_amount' })
    }
    expect(parseTransaction({ ...good, amount: 1 }).ok).toBe(true)
    expect(parseTransaction({ ...good, amount: MAX_AMOUNT }).ok).toBe(true)
  })
  it('rejects impossible or malformed dates; accepts leap day and future dates', () => {
    for (const d of ['2026-02-30', '2026-13-01', '2026-00-10', '2026-1-1', '26-10-06', '2026/10/06', '', 5, null, undefined, '2026-10-06T00:00:00Z']) {
      expect(parseTransaction({ ...good, date: d })).toEqual({ ok: false, error: 'invalid_date' })
    }
    expect(parseTransaction({ ...good, date: '2024-02-29' }).ok).toBe(true)
    expect(parseTransaction({ ...good, date: '2099-12-31' }).ok).toBe(true)
    expect(parseTransaction({ ...good, date: '2025-02-29' }).ok).toBe(false)
  })
  it('rejects non-string notes and notes over 200 chars; accepts exactly 200', () => {
    for (const n of [5, {}, 'x'.repeat(201)]) {
      expect(parseTransaction({ ...good, note: n })).toEqual({ ok: false, error: 'invalid_note' })
    }
    expect(parseTransaction({ ...good, note: 'x'.repeat(200) }).ok).toBe(true)
  })
  it('reports the first failing field in a fixed order (direction, amount, date, note)', () => {
    expect(parseTransaction({ direction: 'x', amount: 0, date: 'x', note: 5 })).toEqual({ ok: false, error: 'invalid_direction' })
    expect(parseTransaction({ ...good, amount: 0, date: 'x' })).toEqual({ ok: false, error: 'invalid_amount' })
  })
})
