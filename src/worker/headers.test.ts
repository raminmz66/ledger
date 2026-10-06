// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest'
import { app } from './index'
import { createTestDb } from './test/db'

const handle = createTestDb()
afterAll(async () => (await handle).dispose())

async function get(path: string, init: RequestInit = {}) {
  const { db } = await handle
  return app.request(path, init, { DB: db, SESSION_SECRET: 's', RESEND_API_KEY: 'r', EMAIL_FROM: 'x' })
}

describe('response headers', () => {
  it.each(['/api/health', '/api/nope', '/api/me'])('%s carries the security and no-store headers', async (path) => {
    const res = await get(path)
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('referrer-policy')).toBe('same-origin')
    expect(res.headers.get('x-frame-options')).toBe('DENY')
    expect(res.headers.get('cross-origin-opener-policy')).toBe('same-origin')
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('also applies to error responses produced by the CSRF middleware and by onError', async () => {
    const csrf = await get('/api/auth/verify', { method: 'POST', headers: { 'content-type': 'text/plain', origin: 'https://evil.example' }, body: '{}' })
    expect(csrf.status).toBe(403)
    expect(csrf.headers.get('x-content-type-options')).toBe('nosniff')
    expect(csrf.headers.get('cache-control')).toBe('no-store')
  })

  it('does not break the cookie headers set by auth routes', async () => {
    const res = await get('/api/auth/logout', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost' } })
    expect(res.status).toBe(204)
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0')
  })
})
