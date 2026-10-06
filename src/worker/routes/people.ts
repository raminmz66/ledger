import { Hono } from 'hono'
import type { AppEnv } from '../env'
import { parseName, parseTransaction } from '../lib/ledger-validate'
import { requireAuth } from '../middleware/require-auth'

export const people = new Hono<AppEnv>()
people.use('*', requireAuth)

const notFound = (c: { json(b: unknown, s: 404): Response }) => c.json({ error: 'not_found' }, 404)

people.get('/', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT p.id, p.name, p.created_at,
            COALESCE(SUM(CASE t.direction WHEN 'paid' THEN t.amount ELSE -t.amount END), 0) AS balance,
            COALESCE(MAX(t.created_at), p.created_at) AS last_activity
     FROM people p LEFT JOIN transactions t ON t.person_id = p.id AND t.user_id = p.user_id
     WHERE p.user_id = ?
     GROUP BY p.id
     ORDER BY last_activity DESC, p.id DESC`,
  ).bind(c.var.userId).all<{ id: string; name: string; balance: number; last_activity: string }>()

  let owedToMe = 0
  let iOwe = 0
  const list = rows.results.map((r) => {
    if (r.balance > 0) owedToMe += r.balance
    else iOwe += -r.balance
    return { id: r.id, name: r.name, balance: r.balance, lastActivity: r.last_activity }
  })
  return c.json({ totals: { owedToMe, iOwe }, people: list })
})

people.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const name = parseName(body?.name)
  if (!name.ok) return c.json({ error: name.error }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO people (id, user_id, name, created_at) VALUES (?, ?, ?, ?)')
    .bind(id, c.var.userId, name.value, new Date().toISOString()).run()
  return c.json({ id, name: name.value }, 201)
})

people.get('/:id', async (c) => {
  const person = await c.env.DB.prepare('SELECT id, name FROM people WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), c.var.userId).first<{ id: string; name: string }>()
  if (!person) return notFound(c)
  const tx = await c.env.DB.prepare(
    `SELECT id, direction, amount, date, note FROM transactions
     WHERE person_id = ? AND user_id = ?
     ORDER BY date DESC, created_at DESC, id DESC`,
  ).bind(person.id, c.var.userId).all<{ id: string; direction: 'paid' | 'received'; amount: number; date: string; note: string | null }>()
  const balance = tx.results.reduce((sum, t) => sum + (t.direction === 'paid' ? t.amount : -t.amount), 0)
  return c.json({ id: person.id, name: person.name, balance, transactions: tx.results })
})

people.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null)
  const name = parseName(body?.name)
  if (!name.ok) return c.json({ error: name.error }, 400)
  const res = await c.env.DB.prepare('UPDATE people SET name = ? WHERE id = ? AND user_id = ?')
    .bind(name.value, c.req.param('id'), c.var.userId).run()
  if (!res.meta.changes) return notFound(c)
  return c.json({ id: c.req.param('id'), name: name.value })
})

people.delete('/:id', async (c) => {
  // ponytail: relies on ON DELETE CASCADE for the person's transactions (covered by a test).
  const res = await c.env.DB.prepare('DELETE FROM people WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), c.var.userId).run()
  if (!res.meta.changes) return notFound(c)
  return c.body(null, 204)
})

people.post('/:id/transactions', async (c) => {
  const body = await c.req.json().catch(() => null)
  const tx = parseTransaction(body)
  if (!tx.ok) return c.json({ error: tx.error }, 400)
  const id = crypto.randomUUID()
  const v = tx.value
  const res = await c.env.DB.prepare(
    'INSERT INTO transactions (id, user_id, person_id, direction, amount, date, note, created_at) SELECT ?, ?, id, ?, ?, ?, ?, ? FROM people WHERE id = ? AND user_id = ?',
  ).bind(id, c.var.userId, v.direction, v.amount, v.date, v.note, new Date().toISOString(), c.req.param('id'), c.var.userId).run()
  if (!res.meta.changes) return notFound(c)
  return c.json({ id, ...v }, 201)
})
