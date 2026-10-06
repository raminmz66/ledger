// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { hmacHex, randomCode, randomToken, sha256Hex, timingSafeEqualHex } from './crypto'

describe('crypto', () => {
  it('sha256Hex matches the known vector for "abc"', async () => {
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('hmacHex is deterministic and depends on the secret', async () => {
    const a = await hmacHex('s1', 'x')
    expect(a).toBe(await hmacHex('s1', 'x'))
    expect(a).not.toBe(await hmacHex('s2', 'x'))
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it('randomCode is always six digits and keeps leading zeros', () => {
    for (let i = 0; i < 500; i++) expect(randomCode()).toMatch(/^\d{6}$/)
  })

  it('randomToken is url-safe, 43 chars, and unique', () => {
    const a = randomToken()
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(randomToken()).not.toBe(a)
  })

  it('timingSafeEqualHex compares equal and unequal strings, incl. different lengths', () => {
    expect(timingSafeEqualHex('abcd', 'abcd')).toBe(true)
    expect(timingSafeEqualHex('abcd', 'abce')).toBe(false)
    expect(timingSafeEqualHex('abcd', 'abc')).toBe(false)
  })
})
