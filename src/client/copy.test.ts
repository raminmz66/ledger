import { describe, expect, it } from 'vitest'
import copy from './copy'

describe('copy', () => {
  const flatten = (v: unknown): string[] =>
    typeof v === 'string' ? [v] : Object.values(v as object).flatMap(flatten)
  const strings = flatten(copy)

  it('uses Persian ی and ک, never Arabic ي or ك', () => {
    for (const s of strings) expect(s).not.toMatch(/[يك]/)
  })

  it('has no Latin digits or em dashes in Persian text', () => {
    for (const s of strings) expect(s).not.toMatch(/[0-9—]/)
  })
})
