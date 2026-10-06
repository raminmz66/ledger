// @vitest-environment node
import { afterAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { app } from '../index'
import { createTestDb } from '../test/db'
import { hmacHex } from '../lib/crypto'

const handle = createTestDb()
afterAll(async () => (await handle).dispose())

const SECRET = 'test-secret'
let sent: { email: string; code: string }[] = []
let now = 1_800_000_000_000

async function env() {
  const { db } = await handle
  return { DB: db, SESSION_SECRET: SECRET, RESEND_API_KEY: 're_x', EMAIL_FROM: 'x <a@b.co>' }
}

async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return app.request(
    path,
    { method: 'POST', headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '1.1.1.1', ...headers }, body: JSON.stringify(body) },
    await env(),
  )
}

beforeEach(async () => {
  const { db } = await handle
  for (const t of ['rate_limits', 'login_codes', 'sessions', 'users']) await db.prepare(`DELETE FROM ${t}`).run()
  sent = []
  now = 1_800_000_000_000
  vi.spyOn(Date, 'now').mockImplementation(() => now)
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (_u, init) => {
    const b = JSON.parse((init as RequestInit).body as string)
    sent.push({ email: b.to[0], code: /: (\d{6})$/.exec(b.subject)![1]! })
    return new Response('{"id":"1"}', { status: 200 })
  })
})
afterEach(() => vi.restoreAllMocks())

async function login(email = 'a@b.co') {
  await post('/api/auth/request-code', { email })
  const code = sent.at(-1)!.code
  const res = await post('/api/auth/verify', { email, code })
  return { res, code, cookie: res.headers.get('set-cookie')! }
}

describe('request-code', () => {
  it('returns 204 and emails a 6-digit code; only a hash is stored', async () => {
    const res = await post('/api/auth/request-code', { email: 'a@b.co' })
    expect(res.status).toBe(204)
    expect(sent).toHaveLength(1)
    const { db } = await handle
    const row = await db.prepare('SELECT * FROM login_codes').first<{ code_hash: string; attempts: number }>()
    expect(row!.code_hash).toBe(await hmacHex(SECRET, `a@b.co:${sent[0]!.code}`))
    expect(row!.code_hash).not.toContain(sent[0]!.code)
  })

  it('answers identically for an existing account and a new email (no enumeration)', async () => {
    await login('known@b.co')
    now += 61_000
    const known = await post('/api/auth/request-code', { email: 'known@b.co' })
    const fresh = await post('/api/auth/request-code', { email: 'fresh@b.co' })
    expect(known.status).toBe(fresh.status)
    expect(await known.text()).toBe(await fresh.text())
  })

  it('rejects invalid emails with 400 invalid_email and sends nothing', async () => {
    for (const email of ['nope', '', null, 7]) {
      const res = await post('/api/auth/request-code', { email })
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'invalid_email' })
    }
    expect(sent).toHaveLength(0)
  })

  it('normalizes the email (case and whitespace)', async () => {
    await post('/api/auth/request-code', { email: '  A@B.CO ' })
    expect(sent[0]!.email).toBe('a@b.co')
  })

  it('limits one code per 60 s per email, with retryAfter', async () => {
    await post('/api/auth/request-code', { email: 'a@b.co' })
    now += 10_000
    const res = await post('/api/auth/request-code', { email: 'a@b.co' })
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ error: 'rate_limited', retryAfter: 50 })
    expect(sent).toHaveLength(1)
  })

  it('limits 5 codes per hour per email', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await post('/api/auth/request-code', { email: 'a@b.co' })).status).toBe(204)
      now += 61_000
    }
    expect((await post('/api/auth/request-code', { email: 'a@b.co' })).status).toBe(429)
  })

  it('limits 20 codes per hour per IP across emails', async () => {
    for (let i = 0; i < 20; i++) {
      expect((await post('/api/auth/request-code', { email: `u${i}@b.co` })).status).toBe(204)
    }
    expect((await post('/api/auth/request-code', { email: 'u99@b.co' })).status).toBe(429)
  })

  it('returns 502 email_failed when Resend fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 403 }))
    const res = await post('/api/auth/request-code', { email: 'a@b.co' })
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: 'email_failed' })
  })
})

describe('verify', () => {
  it('logs in with the right code: creates the user, sets a hardened cookie, /api/me works', async () => {
    const { res, cookie } = await login('Me@B.co')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ email: 'me@b.co' })
    expect(cookie).toMatch(/^sid=[A-Za-z0-9_-]{43};/)
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/', 'Max-Age=2592000']) {
      expect(cookie).toContain(flag)
    }
    const me = await app.request('/api/me', { headers: { cookie: cookie.split(';')[0]! } }, await env())
    expect(me.status).toBe(200)
    expect(await me.json()).toEqual({ email: 'me@b.co' })
  })

  it('stores only the SHA-256 of the session token', async () => {
    const { cookie } = await login()
    const token = /sid=([^;]+)/.exec(cookie)![1]!
    const { db } = await handle
    const row = await db.prepare('SELECT token_hash FROM sessions').first<{ token_hash: string }>()
    expect(row!.token_hash).not.toBe(token)
    expect(row!.token_hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('accepts Persian digits and a differently-cased email', async () => {
    await post('/api/auth/request-code', { email: 'a@b.co' })
    const fa = sent[0]!.code.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]!)
    const res = await post('/api/auth/verify', { email: ' A@B.co ', code: fa })
    expect(res.status).toBe(200)
  })

  it('a used code cannot be replayed', async () => {
    const { code } = await login()
    const again = await post('/api/auth/verify', { email: 'a@b.co', code })
    expect(again.status).toBe(400)
    expect(await again.json()).toEqual({ error: 'code_expired' })
  })

  it('wrong code decrements attemptsLeft and the 5th wrong try kills the code', async () => {
    await post('/api/auth/request-code', { email: 'a@b.co' })
    const wrong = sent[0]!.code === '000000' ? '111111' : '000000'
    for (let i = 1; i <= 5; i++) {
      const res = await post('/api/auth/verify', { email: 'a@b.co', code: wrong })
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'wrong_code', attemptsLeft: 5 - i })
    }
    const right = await post('/api/auth/verify', { email: 'a@b.co', code: sent[0]!.code })
    expect(await right.json()).toEqual({ error: 'code_expired' })
  })

  it('expired code returns code_expired and is deleted', async () => {
    await post('/api/auth/request-code', { email: 'a@b.co' })
    now += 10 * 60_000 + 1000
    const res = await post('/api/auth/verify', { email: 'a@b.co', code: sent[0]!.code })
    expect(await res.json()).toEqual({ error: 'code_expired' })
    const { db } = await handle
    expect((await db.prepare('SELECT COUNT(*) AS n FROM login_codes').first<{ n: number }>())!.n).toBe(0)
  })

  it('malformed codes return 400 invalid_code without consuming attempts', async () => {
    await post('/api/auth/request-code', { email: 'a@b.co' })
    const res = await post('/api/auth/verify', { email: 'a@b.co', code: '12' })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_code' })
    const { db } = await handle
    expect((await db.prepare('SELECT attempts FROM login_codes').first<{ attempts: number }>())!.attempts).toBe(0)
  })

  it('blocks an IP after 30 failed verifies in an hour', async () => {
    for (let i = 0; i < 30; i++) await post('/api/auth/verify', { email: `x${i}@b.co`, code: '123456' })
    const res = await post('/api/auth/verify', { email: 'x@b.co', code: '123456' })
    expect(res.status).toBe(429)
  })

  it('parallel wrong guesses cannot exceed 5 attempts', async () => {
    await post('/api/auth/request-code', { email: 'a@b.co' })
    const wrong = sent[0]!.code === '000000' ? '111111' : '000000'
    const results = await Promise.all(Array.from({ length: 8 }, () => post('/api/auth/verify', { email: 'a@b.co', code: wrong })))
    const wrongCount = (await Promise.all(results.map((r) => r.json()))).filter((b: any) => b.error === 'wrong_code').length
    expect(wrongCount).toBeLessThanOrEqual(5)
  })
})

describe('session', () => {
  it('/api/me without a cookie or with a bad cookie is 401', async () => {
    expect((await app.request('/api/me', {}, await env())).status).toBe(401)
    expect((await app.request('/api/me', { headers: { cookie: 'sid=bogus' } }, await env())).status).toBe(401)
  })

  it('expired sessions are rejected', async () => {
    const { cookie } = await login()
    now += 31 * 24 * 3600_000
    const me = await app.request('/api/me', { headers: { cookie: cookie.split(';')[0]! } }, await env())
    expect(me.status).toBe(401)
  })

  it('logout deletes the session so the old cookie stops working', async () => {
    const { cookie } = await login()
    const c = cookie.split(';')[0]!
    const out = await app.request('/api/auth/logout', { method: 'POST', headers: { cookie: c } }, await env())
    expect(out.status).toBe(204)
    expect(out.headers.get('set-cookie')).toContain('Max-Age=0')
    expect((await app.request('/api/me', { headers: { cookie: c } }, await env())).status).toBe(401)
  })
})
