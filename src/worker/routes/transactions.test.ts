// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '../index'
import { createSession } from '../test/session'
import { createTestDb } from '../test/db'

const handle = createTestDb()
afterAll(async () => (await handle).dispose())

let A: { userId: string; cookie: string }
let B: { userId: string; cookie: string }

async function call(method: string, path: string, who: { cookie: string } | null, body?: unknown) {
  const { db } = await handle
  return app.request(
    path,
    { method, headers: { 'content-type': 'application/json', ...(who ? { cookie: who.cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) },
    { DB: db, SESSION_SECRET: 's', RESEND_API_KEY: 'r', EMAIL_FROM: 'x' },
  )
}
const person = async (who: { cookie: string }, name = 'علی') => ((await (await call('POST', '/api/people', who, { name })).json()) as any).id as string
const tx = { direction: 'paid', amount: 2_500_000, date: '2026-10-06', note: 'قرض ماشین' }

beforeEach(async () => {
  const { db } = await handle
  for (const t of ['transactions', 'people', 'sessions', 'users']) await db.prepare(`DELETE FROM ${t}`).run()
  A = await createSession(db, 'a@b.co')
  B = await createSession(db, 'b@b.co')
})

describe('POST /api/people/:id/transactions', () => {
  it('creates a transaction (201) that shows up in the person detail and balance', async () => {
    const pid = await person(A)
    const res = await call('POST', `/api/people/${pid}/transactions`, A, tx)
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ id: expect.any(String), ...tx })
    const detail = (await (await call('GET', `/api/people/${pid}`, A)).json()) as any
    expect(detail.balance).toBe(2_500_000)
    expect(detail.transactions).toHaveLength(1)
  })
  it('a received transaction lowers the balance; note defaults to null', async () => {
    const pid = await person(A)
    await call('POST', `/api/people/${pid}/transactions`, A, tx)
    const res = await call('POST', `/api/people/${pid}/transactions`, A, { direction: 'received', amount: 3_000_000, date: '2026-10-07' })
    expect(((await res.json()) as any).note).toBeNull()
    expect(((await (await call('GET', `/api/people/${pid}`, A)).json()) as any).balance).toBe(-500_000)
  })
  it('returns 400 with the validation code for bad input and stores nothing', async () => {
    const pid = await person(A)
    for (const [patch, code] of [
      [{ direction: 'x' }, 'invalid_direction'],
      [{ amount: 0 }, 'invalid_amount'],
      [{ amount: '5' }, 'invalid_amount'],
      [{ date: '2026-02-30' }, 'invalid_date'],
      [{ note: 'x'.repeat(201) }, 'invalid_note'],
    ] as const) {
      const res = await call('POST', `/api/people/${pid}/transactions`, A, { ...tx, ...patch })
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: code })
    }
    expect((await call('POST', `/api/people/${pid}/transactions`, A, 'nope')).status).toBe(400)
    expect(((await (await call('GET', `/api/people/${pid}`, A)).json()) as any).transactions).toEqual([])
  })
  it("404s for unknown people and cannot attach to another user's person", async () => {
    const pid = await person(A)
    expect((await call('POST', '/api/people/nope/transactions', A, tx)).status).toBe(404)
    expect((await call('POST', `/api/people/${pid}/transactions`, B, tx)).status).toBe(404)
    expect(((await (await call('GET', `/api/people/${pid}`, A)).json()) as any).transactions).toEqual([])
  })
})

describe('PATCH /api/transactions/:id', () => {
  async function seed() {
    const pid = await person(A)
    const created = (await (await call('POST', `/api/people/${pid}/transactions`, A, tx)).json()) as any
    return { pid, id: created.id as string }
  }
  it('updates every field and the balance follows', async () => {
    const { pid, id } = await seed()
    const next = { direction: 'received', amount: 1_000_000, date: '2026-10-08', note: '  برگشت  ' }
    const res = await call('PATCH', `/api/transactions/${id}`, A, next)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id, direction: 'received', amount: 1_000_000, date: '2026-10-08', note: 'برگشت' })
    expect(((await (await call('GET', `/api/people/${pid}`, A)).json()) as any).balance).toBe(-1_000_000)
  })
  it('keeps the transaction on the same person and does not touch other transactions', async () => {
    const { pid, id } = await seed()
    await call('POST', `/api/people/${pid}/transactions`, A, { ...tx, amount: 5 })
    await call('PATCH', `/api/transactions/${id}`, A, { ...tx, amount: 9 })
    const detail = (await (await call('GET', `/api/people/${pid}`, A)).json()) as any
    expect(detail.transactions.map((t: any) => t.amount).sort()).toEqual([5, 9])
  })
  it('rejects invalid input with 400 and leaves the row unchanged', async () => {
    const { pid, id } = await seed()
    expect((await call('PATCH', `/api/transactions/${id}`, A, { ...tx, amount: -1 })).status).toBe(400)
    expect(((await (await call('GET', `/api/people/${pid}`, A)).json()) as any).balance).toBe(2_500_000)
  })
  it("cannot edit another user's transaction (404, unchanged); unknown id 404s", async () => {
    const { pid, id } = await seed()
    expect((await call('PATCH', `/api/transactions/${id}`, B, { ...tx, amount: 1 })).status).toBe(404)
    expect((await call('PATCH', '/api/transactions/nope', A, tx)).status).toBe(404)
    expect(((await (await call('GET', `/api/people/${pid}`, A)).json()) as any).balance).toBe(2_500_000)
  })
})

describe('DELETE /api/transactions/:id', () => {
  it('deletes and the balance follows', async () => {
    const pid = await person(A)
    const id = ((await (await call('POST', `/api/people/${pid}/transactions`, A, tx)).json()) as any).id
    expect((await call('DELETE', `/api/transactions/${id}`, A)).status).toBe(204)
    expect(((await (await call('GET', `/api/people/${pid}`, A)).json()) as any).balance).toBe(0)
  })
  it("cannot delete another user's transaction; unknown id 404s", async () => {
    const pid = await person(A)
    const id = ((await (await call('POST', `/api/people/${pid}/transactions`, A, tx)).json()) as any).id
    expect((await call('DELETE', `/api/transactions/${id}`, B)).status).toBe(404)
    expect((await call('DELETE', '/api/transactions/nope', A)).status).toBe(404)
    expect(((await (await call('GET', `/api/people/${pid}`, A)).json()) as any).transactions).toHaveLength(1)
  })
})

describe('malformed bodies and field tampering', () => {
  const raw = async (method: string, path: string, who: { cookie: string }, body: string) =>
    app.request(path, { method, headers: { 'content-type': 'application/json', cookie: who.cookie }, body }, { DB: (await handle).db, SESSION_SECRET: 's', RESEND_API_KEY: 'r', EMAIL_FROM: 'x' })
  it('raw "{" returns 400 invalid_body on POST transactions and PATCH transaction', async () => {
    const pid = await person(A)
    const id = ((await (await call('POST', `/api/people/${pid}/transactions`, A, tx)).json()) as any).id
    for (const [m, path] of [['POST', `/api/people/${pid}/transactions`], ['PATCH', `/api/transactions/${id}`]]) {
      const res = await raw(m!, path!, A, '{')
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'invalid_body' })
    }
  })
  it('PATCH ignores person_id and user_id in the body', async () => {
    const { db } = await handle
    const pid = await person(A)
    const other = await person(B, 'دیگری')
    const id = ((await (await call('POST', `/api/people/${pid}/transactions`, A, tx)).json()) as any).id
    const res = await call('PATCH', `/api/transactions/${id}`, A, { ...tx, amount: 3, person_id: other, user_id: B.userId })
    expect(res.status).toBe(200)
    const row = await db.prepare('SELECT person_id, user_id, amount FROM transactions WHERE id = ?').bind(id).first<any>()
    expect(row).toEqual({ person_id: pid, user_id: A.userId, amount: 3 })
  })
})
