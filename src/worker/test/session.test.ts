// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest'
import { app } from '../index'
import { createSession } from './session'
import { createTestDb } from './db'

const handle = createTestDb()
afterAll(async () => (await handle).dispose())

describe('createSession', () => {
  it('creates a user and a cookie that /api/me accepts; the same email reuses the user', async () => {
    const { db } = await handle
    const env = { DB: db, SESSION_SECRET: 's', RESEND_API_KEY: 'r', EMAIL_FROM: 'x' }
    const a = await createSession(db, 'Helper@B.co')
    const b = await createSession(db, 'helper@b.co')
    expect(a.userId).toBe(b.userId)
    const me = await app.request('/api/me', { headers: { cookie: a.cookie } }, env)
    expect(await me.json()).toEqual({ email: 'helper@b.co' })
  })
})
