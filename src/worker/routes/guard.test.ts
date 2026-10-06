// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest'
import { app } from '../index'
import { createTestDb } from '../test/db'

const handle = createTestDb()
afterAll(async () => (await handle).dispose())

// Every non-auth, non-health API route. Add new routes here when they are added.
const PROTECTED: [string, string][] = [
  ['GET', '/api/me'],
  ['GET', '/api/people'],
  ['POST', '/api/people'],
  ['GET', '/api/people/x'],
  ['PATCH', '/api/people/x'],
  ['DELETE', '/api/people/x'],
  ['POST', '/api/people/x/transactions'],
  ['PATCH', '/api/transactions/x'],
  ['DELETE', '/api/transactions/x'],
]

describe('auth guard', () => {
  it.each(PROTECTED)('%s %s returns 401 without a session cookie', async (method, path) => {
    const { db } = await handle
    const res = await app.request(
      path,
      { method, headers: { 'content-type': 'application/json' }, body: method === 'GET' || method === 'DELETE' ? undefined : '{}' },
      { DB: db, SESSION_SECRET: 's', RESEND_API_KEY: 'r', EMAIL_FROM: 'x' },
    )
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthorized' })
  })

  it('has an entry here for every registered /api route except auth and health', () => {
    const registered = app.routes
      .map((r) => `${r.method} ${r.path}`)
      .filter((s) => !s.startsWith('ALL') && !/\/api\/(auth|health)/.test(s) && !s.includes('*'))
    for (const entry of registered) {
      const [method, path] = entry.split(' ')
      const pattern = new RegExp('^' + path!.replace(/:[^/]+/g, '[^/]+') + '$')
      expect(PROTECTED.some(([m, p]) => m === method && pattern.test(p)), `${entry} missing from PROTECTED`).toBe(true)
    }
  })
})
