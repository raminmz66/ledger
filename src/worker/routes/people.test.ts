// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '../index'
import { createSession } from '../test/session'
import { createTestDb } from '../test/db'

const handle = createTestDb()
afterAll(async () => (await handle).dispose())

let A: { userId: string; cookie: string }
let B: { userId: string; cookie: string }

async function env() {
  return { DB: (await handle).db, SESSION_SECRET: 's', RESEND_API_KEY: 'r', EMAIL_FROM: 'x' }
}
async function call(method: string, path: string, who: { cookie: string } | null, body?: unknown) {
  return app.request(
    path,
    {
      method,
      headers: { 'content-type': 'application/json', ...(who ? { cookie: who.cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    await env(),
  )
}
async function addTx(personId: string, who: { userId: string }, direction: 'paid' | 'received', amount: number, date: string, createdAt: string) {
  const { db } = await handle
  await db
    .prepare('INSERT INTO transactions (id,user_id,person_id,direction,amount,date,note,created_at) VALUES (?,?,?,?,?,?,NULL,?)')
    .bind(crypto.randomUUID(), who.userId, personId, direction, amount, date, createdAt)
    .run()
}
async function newPerson(who: { cookie: string }, name: string) {
  const res = await call('POST', '/api/people', who, { name })
  return (await res.json()) as { id: string; name: string }
}

beforeEach(async () => {
  const { db } = await handle
  for (const t of ['transactions', 'people', 'sessions', 'users']) await db.prepare(`DELETE FROM ${t}`).run()
  A = await createSession(db, 'a@b.co')
  B = await createSession(db, 'b@b.co')
})

describe('POST /api/people', () => {
  it('creates a person and returns 201 {id,name}; names are trimmed and normalized', async () => {
    const res = await call('POST', '/api/people', A, { name: '  علي ' })
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ id: expect.any(String), name: 'علی' })
  })
  it('rejects invalid names with 400 invalid_name', async () => {
    for (const body of [{ name: '' }, { name: '   ' }, { name: 'x'.repeat(61) }, { name: 5 }, {}, null]) {
      const res = await call('POST', '/api/people', A, body)
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'invalid_name' })
    }
  })
  it('allows duplicate names', async () => {
    await newPerson(A, 'علی')
    expect((await call('POST', '/api/people', A, { name: 'علی' })).status).toBe(201)
  })
})

describe('GET /api/people', () => {
  it('lists people with balances and totals; person with no transactions has balance 0', async () => {
    const ali = await newPerson(A, 'علی')
    const maryam = await newPerson(A, 'مریم')
    const sara = await newPerson(A, 'سارا')
    await addTx(ali.id, A, 'paid', 10_000_000, '2026-10-01', '2026-10-01T10:00:00.000Z')
    await addTx(ali.id, A, 'received', 2_000_000, '2026-10-02', '2026-10-02T10:00:00.000Z')
    await addTx(maryam.id, A, 'received', 3_200_000, '2026-10-03', '2026-10-03T10:00:00.000Z')
    const res = await call('GET', '/api/people', A)
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    const byId = Object.fromEntries(body.people.map((p: any) => [p.id, p]))
    expect(byId[ali.id].balance).toBe(8_000_000)
    expect(byId[maryam.id].balance).toBe(-3_200_000)
    expect(byId[sara.id].balance).toBe(0)
    expect(body.totals).toEqual({ owedToMe: 8_000_000, iOwe: 3_200_000 })
  })
  it('sorts by latest activity, newest first, and uses created_at for people without transactions', async () => {
    const old = await newPerson(A, 'قدیمی')
    const active = await newPerson(A, 'فعال')
    await addTx(active.id, A, 'paid', 1, '2026-10-01', '2099-01-01T00:00:00.000Z')
    const body = (await (await call('GET', '/api/people', A)).json()) as any
    expect(body.people.map((p: any) => p.id)).toEqual([active.id, old.id])
    expect(body.people[0].lastActivity).toBe('2099-01-01T00:00:00.000Z')
  })
  it('sums 1e12-sized amounts without precision loss', async () => {
    const p = await newPerson(A, 'ثروتمند')
    for (let i = 0; i < 5; i++) await addTx(p.id, A, 'paid', 1_000_000_000_000, '2026-10-01', `2026-10-0${i + 1}T00:00:00.000Z`)
    const body = (await (await call('GET', '/api/people', A)).json()) as any
    expect(body.people[0].balance).toBe(5_000_000_000_000)
    expect(body.totals.owedToMe).toBe(5_000_000_000_000)
  })
  it('returns an empty list and zero totals for a new user', async () => {
    expect(await (await call('GET', '/api/people', A)).json()).toEqual({ totals: { owedToMe: 0, iOwe: 0 }, people: [] })
  })
  it("never includes another user's people", async () => {
    await newPerson(B, 'مال بی')
    expect(((await (await call('GET', '/api/people', A)).json()) as any).people).toEqual([])
  })
})

describe('GET /api/people/:id', () => {
  it('returns the person, balance and transactions newest first (date, then created_at)', async () => {
    const p = await newPerson(A, 'علی')
    await addTx(p.id, A, 'paid', 100, '2026-10-01', '2026-10-01T09:00:00.000Z')
    await addTx(p.id, A, 'received', 40, '2026-10-05', '2026-10-05T09:00:00.000Z')
    await addTx(p.id, A, 'paid', 7, '2026-10-05', '2026-10-05T11:00:00.000Z')
    const body = (await (await call('GET', `/api/people/${p.id}`, A)).json()) as any
    expect(body).toMatchObject({ id: p.id, name: 'علی', balance: 67 })
    expect(body.transactions.map((t: any) => t.amount)).toEqual([7, 40, 100])
    expect(body.transactions[0]).toEqual({ id: expect.any(String), direction: 'paid', amount: 7, date: '2026-10-05', note: null })
  })
  it('404s for unknown ids and for another user\'s person', async () => {
    const p = await newPerson(A, 'علی')
    expect((await call('GET', '/api/people/nope', A)).status).toBe(404)
    const res = await call('GET', `/api/people/${p.id}`, B)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'not_found' })
  })
})

describe('PATCH /api/people/:id', () => {
  it('renames and returns the new name', async () => {
    const p = await newPerson(A, 'علی')
    const res = await call('PATCH', `/api/people/${p.id}`, A, { name: ' علی رضایی ' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: p.id, name: 'علی رضایی' })
  })
  it('rejects invalid names and does not rename', async () => {
    const p = await newPerson(A, 'علی')
    expect((await call('PATCH', `/api/people/${p.id}`, A, { name: '' })).status).toBe(400)
    expect(((await (await call('GET', `/api/people/${p.id}`, A)).json()) as any).name).toBe('علی')
  })
  it("cannot rename another user's person", async () => {
    const p = await newPerson(A, 'علی')
    expect((await call('PATCH', `/api/people/${p.id}`, B, { name: 'هک' })).status).toBe(404)
    expect(((await (await call('GET', `/api/people/${p.id}`, A)).json()) as any).name).toBe('علی')
  })
})

describe('DELETE /api/people/:id', () => {
  it('deletes the person and only that person\'s transactions', async () => {
    const { db } = await handle
    const gone = await newPerson(A, 'حذف')
    const kept = await newPerson(A, 'می‌ماند')
    const other = await newPerson(B, 'دیگری')
    await addTx(gone.id, A, 'paid', 1, '2026-10-01', '2026-10-01T00:00:00.000Z')
    await addTx(kept.id, A, 'paid', 2, '2026-10-01', '2026-10-01T00:00:00.000Z')
    await addTx(other.id, B, 'paid', 3, '2026-10-01', '2026-10-01T00:00:00.000Z')
    expect((await call('DELETE', `/api/people/${gone.id}`, A)).status).toBe(204)
    const rows = await db.prepare('SELECT amount FROM transactions ORDER BY amount').all<{ amount: number }>()
    expect(rows.results.map((r) => r.amount)).toEqual([2, 3])
    expect((await call('GET', `/api/people/${gone.id}`, A)).status).toBe(404)
  })
  it("cannot delete another user's person (404, data intact)", async () => {
    const p = await newPerson(A, 'علی')
    expect((await call('DELETE', `/api/people/${p.id}`, B)).status).toBe(404)
    expect((await call('GET', `/api/people/${p.id}`, A)).status).toBe(200)
  })
  it('404s for unknown ids', async () => {
    expect((await call('DELETE', '/api/people/nope', A)).status).toBe(404)
  })
})

describe('auth', () => {
  it('returns 401 without a cookie', async () => {
    expect((await call('GET', '/api/people', null)).status).toBe(401)
    expect((await call('POST', '/api/people', null, { name: 'x' })).status).toBe(401)
  })
})
