import { describe, expect, it } from 'vitest'
import copy from './copy'
import { errorMessage } from './errors'

describe('errorMessage', () => {
  it('maps a network failure (status 0) to the connection message', () => {
    expect(errorMessage({ status: 0, data: null })).toBe(copy.errors.network)
  })
  it.each(['invalid_name', 'invalid_amount', 'invalid_date', 'invalid_note', 'invalid_direction', 'invalid_body', 'not_found', 'internal'] as const)(
    'maps %s',
    (code) => {
      expect(errorMessage({ status: 400, data: { error: code } })).toBe(copy.errors[code])
    },
  )
  it('falls back to the generic message for unknown codes and empty bodies', () => {
    expect(errorMessage({ status: 500, data: { error: 'weird' } })).toBe(copy.errors.internal)
    expect(errorMessage({ status: 500, data: null })).toBe(copy.errors.internal)
  })
})
