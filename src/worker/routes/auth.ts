import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { AppEnv } from '../env'
import { hmacHex, randomCode, randomToken, sha256Hex, timingSafeEqualHex } from '../lib/crypto'
import { sendLoginCode } from '../lib/mail'
import { hit, isLimited } from '../lib/rate-limit'
import { normalizeCode, normalizeEmail } from '../lib/validate'
import { SESSION_COOKIE } from '../middleware/require-auth'

export const SESSION_DAYS = 30
export const CODE_MINUTES = 10
export const MAX_ATTEMPTS = 5

const HOUR = 3600

export const auth = new Hono<AppEnv>()

const limited = (retryAfter: number) => ({ error: 'rate_limited', retryAfter })
const ipOf = (c: { req: { header(n: string): string | undefined } }) => c.req.header('CF-Connecting-IP') ?? 'local'

auth.post('/request-code', async (c) => {
  const body = await c.req.json().catch(() => null)
  const email = normalizeEmail(body?.email)
  if (!email) return c.json({ error: 'invalid_email' }, 400)

  const ip = ipOf(c)
  for (const [key, max, win] of [
    [`send:email:${email}`, 1, 60],
    [`sendh:email:${email}`, 5, HOUR],
    [`send:ip:${ip}`, 20, HOUR],
  ] as const) {
    const r = await hit(c.env.DB, key, max, win)
    if (!r.allowed) return c.json(limited(r.retryAfter), 429)
  }

  const code = randomCode()
  const hash = await hmacHex(c.env.SESSION_SECRET, `${email}:${code}`)
  const expiresAt = new Date(Date.now() + CODE_MINUTES * 60_000).toISOString()
  await c.env.DB.prepare(
    `INSERT INTO login_codes (email, code_hash, expires_at, attempts) VALUES (?, ?, ?, 0)
     ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0`,
  ).bind(email, hash, expiresAt).run()

  try {
    await sendLoginCode(c.env, email, code)
  } catch {
    return c.json({ error: 'email_failed' }, 502)
  }
  return c.body(null, 204)
})

auth.post('/verify', async (c) => {
  const body = await c.req.json().catch(() => null)
  const email = normalizeEmail(body?.email)
  const code = normalizeCode(body?.code)
  if (!email) return c.json({ error: 'invalid_email' }, 400)
  if (!code) return c.json({ error: 'invalid_code' }, 400)

  const db = c.env.DB
  const failKey = `fail:ip:${ipOf(c)}`
  const gate = await isLimited(db, failKey, 30)
  if (!gate.allowed) return c.json(limited(gate.retryAfter), 429)

  const fail = async () => { await hit(db, failKey, 30, HOUR) }
  const nowIso = new Date(Date.now()).toISOString()

  const row = await db.prepare('SELECT code_hash, expires_at FROM login_codes WHERE email = ?')
    .bind(email).first<{ code_hash: string; expires_at: string }>()
  if (!row) { await fail(); return c.json({ error: 'code_expired' }, 400) }
  if (row.expires_at <= nowIso) {
    await db.prepare('DELETE FROM login_codes WHERE email = ?').bind(email).run()
    await fail()
    return c.json({ error: 'code_expired' }, 400)
  }

  const expected = await hmacHex(c.env.SESSION_SECRET, `${email}:${code}`)
  if (!timingSafeEqualHex(expected, row.code_hash)) {
    const upd = await db.prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE email = ? RETURNING attempts')
      .bind(email).first<{ attempts: number }>()
    const attempts = upd?.attempts ?? MAX_ATTEMPTS + 1
    if (attempts >= MAX_ATTEMPTS) await db.prepare('DELETE FROM login_codes WHERE email = ?').bind(email).run()
    await fail()
    // Row already killed by a concurrent request (or over budget): not a counted guess.
    if (attempts > MAX_ATTEMPTS) return c.json({ error: 'code_expired' }, 400)
    return c.json({ error: 'wrong_code', attemptsLeft: Math.max(0, MAX_ATTEMPTS - attempts) }, 400)
  }

  // Consume atomically: a second concurrent verify with the same code finds no row.
  const consumed = await db.prepare('DELETE FROM login_codes WHERE email = ? AND code_hash = ? RETURNING email')
    .bind(email, row.code_hash).first()
  if (!consumed) { await fail(); return c.json({ error: 'code_expired' }, 400) }

  await db.prepare('INSERT OR IGNORE INTO users (id, email, created_at) VALUES (?, ?, ?)')
    .bind(crypto.randomUUID(), email, nowIso).run()
  const user = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>()

  const token = randomToken()
  await db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await sha256Hex(token), user!.id, new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString()).run()

  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: SESSION_DAYS * 86_400,
  })
  return c.json({ email })
})

auth.post('/logout', async (c) => {
  const token = getCookie(c, SESSION_COOKIE)
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run()
  deleteCookie(c, SESSION_COOKIE, { path: '/', secure: true })
  return c.body(null, 204)
})
