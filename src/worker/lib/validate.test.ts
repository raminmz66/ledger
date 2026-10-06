// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { normalizeCode, normalizeEmail } from './validate'

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Ramin@Gmail.COM ')).toBe('ramin@gmail.com')
  })
  it('rejects non-strings, empty, no @, no dot in domain, spaces inside, and >254 chars', () => {
    for (const bad of [undefined, null, 5, '', 'abc', 'a@b', 'a b@c.com', 'a@@c.com', `${'a'.repeat(250)}@x.com`]) {
      expect(normalizeEmail(bad)).toBeNull()
    }
  })
})

describe('normalizeCode', () => {
  it('accepts Latin, Persian and Arabic-Indic digits', () => {
    expect(normalizeCode('481209')).toBe('481209')
    expect(normalizeCode('۴۸۱۲۰۹')).toBe('481209')
    expect(normalizeCode('٤٨١٢٠٩')).toBe('481209')
  })
  it('ignores spaces and zero-width characters', () => {
    expect(normalizeCode(' 481 209 ')).toBe('481209')
    expect(normalizeCode('481‌209')).toBe('481209')
  })
  it('rejects wrong length and non-digits', () => {
    for (const bad of ['12345', '1234567', 'abcdef', '', null, 123456]) {
      expect(normalizeCode(bad)).toBeNull()
    }
  })
})
