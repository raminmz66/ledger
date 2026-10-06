import { describe, expect, it } from 'vitest'
import { safeReturnPath } from './return-to'

describe('safeReturnPath', () => {
  it.each(['/', '/people/abc', '/settings', '/people/abc?x=1'])('keeps in-app path %s', (p) => {
    expect(safeReturnPath(p)).toBe(p)
  })
  it.each([
    '//evil.example', '/\\evil.example', 'https://evil.example', 'javascript:alert(1)', 'evil', '', '/login', '/login?x=1', '/login/', undefined, null, 5, {},
    '/' + 'a'.repeat(600),
  ])('rejects %s and falls back to /', (p) => {
    expect(safeReturnPath(p as unknown)).toBe('/')
  })
})
