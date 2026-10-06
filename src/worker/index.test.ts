// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { app } from './index'

describe('worker', () => {
  it('answers /api/health', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('turns thrown errors into JSON 500', async () => {
    // No bindings supplied, so the handler throws on c.env.
    const res = await app.request('/api/me', { headers: { Cookie: 'sid=x' } })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'internal' })
  })

  it('returns JSON 404 for unknown API paths', async () => {
    const res = await app.request('/api/nope')
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(await res.json()).toEqual({ error: 'not_found' })
  })
})
