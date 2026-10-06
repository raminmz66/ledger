import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import type { AppEnv } from './env'
import { cleanupExpired } from './lib/cleanup'
import { requireAuth } from './middleware/require-auth'
import { auth } from './routes/auth'

export const app = new Hono<AppEnv>()

app.use('/api/*', csrf())

app.get('/api/health', (c) => c.json({ ok: true }))
app.route('/api/auth', auth)

app.get('/api/me', requireAuth, async (c) => {
  const row = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?')
    .bind(c.var.userId).first<{ email: string }>()
  return row ? c.json({ email: row.email }) : c.json({ error: 'unauthorized' }, 401)
})

app.notFound((c) => c.json({ error: 'not_found' }, 404))

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledController, env: AppEnv['Bindings'], ctx: ExecutionContext) {
    ctx.waitUntil(cleanupExpired(env.DB))
  },
}
