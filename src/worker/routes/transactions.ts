import { Hono } from 'hono'
import type { AppEnv } from '../env'
import { parseTransaction } from '../lib/ledger-validate'
import { requireAuth } from '../middleware/require-auth'

export const transactions = new Hono<AppEnv>()
transactions.use('*', requireAuth)

transactions.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null)
  const tx = parseTransaction(body)
  if (!tx.ok) return c.json({ error: tx.error }, 400)
  const v = tx.value
  const res = await c.env.DB.prepare(
    'UPDATE transactions SET direction = ?, amount = ?, date = ?, note = ? WHERE id = ? AND user_id = ?',
  ).bind(v.direction, v.amount, v.date, v.note, c.req.param('id'), c.var.userId).run()
  if (!res.meta.changes) return c.json({ error: 'not_found' }, 404)
  return c.json({ id: c.req.param('id'), ...v })
})

transactions.delete('/:id', async (c) => {
  const res = await c.env.DB.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), c.var.userId).run()
  if (!res.meta.changes) return c.json({ error: 'not_found' }, 404)
  return c.body(null, 204)
})
