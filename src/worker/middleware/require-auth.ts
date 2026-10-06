import { getCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../env'
import { sha256Hex } from '../lib/crypto'

export const SESSION_COOKIE = 'sid'

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE)
  if (token) {
    const row = await c.env.DB.prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?')
      .bind(await sha256Hex(token), new Date(Date.now()).toISOString())
      .first<{ user_id: string }>()
    if (row) {
      c.set('userId', row.user_id)
      return next()
    }
  }
  return c.json({ error: 'unauthorized' }, 401)
})
