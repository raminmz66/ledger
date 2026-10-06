import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'

afterEach(() => vi.unstubAllGlobals())

describe('api', () => {
  it('returns parsed JSON and ok flag', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"email":"a@b.co"}', { status: 200 })))
    expect(await api('GET', '/api/me')).toEqual({ ok: true, status: 200, data: { email: 'a@b.co' } })
  })
  it('does not throw on HTTP errors and keeps the error body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":"wrong_code","attemptsLeft":2}', { status: 400 })))
    expect(await api('POST', '/api/auth/verify', {})).toEqual({ ok: false, status: 400, data: { error: 'wrong_code', attemptsLeft: 2 } })
  })
  it('handles empty 204 bodies', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    expect(await api('POST', '/api/auth/logout')).toEqual({ ok: true, status: 204, data: null })
  })
  it('reports network failure as status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('x')))
    expect(await api('GET', '/api/me')).toEqual({ ok: false, status: 0, data: null })
  })
  it('keeps the real status when the body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Forbidden', { status: 403 })))
    expect(await api('POST', '/api/x', {})).toEqual({ ok: false, status: 403, data: null })
  })
  it('sends JSON with same-origin credentials', async () => {
    const f = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', f)
    await api('POST', '/api/x', { a: 1 })
    const init = f.mock.calls[0]![1]
    expect(init.credentials).toBe('same-origin')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.body).toBe('{"a":1}')
  })
})
