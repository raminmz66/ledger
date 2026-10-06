// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb } from '../test/db'
import { hit, isLimited } from './rate-limit'

const handle = createTestDb()
afterAll(async () => (await handle).dispose())
beforeEach(async () => {
  await (await handle).db.prepare('DELETE FROM rate_limits').run()
})

describe('hit', () => {
  it('allows up to max, then blocks with a positive retryAfter', async () => {
    const { db } = await handle
    const t = 1_000_000
    expect((await hit(db, 'k', 2, 60, t)).allowed).toBe(true)
    expect((await hit(db, 'k', 2, 60, t + 1000)).allowed).toBe(true)
    const third = await hit(db, 'k', 2, 60, t + 2000)
    expect(third.allowed).toBe(false)
    expect(third.retryAfter).toBe(58)
  })

  it('starts a fresh window once reset_at has passed', async () => {
    const { db } = await handle
    const t = 5_000_000
    await hit(db, 'k', 1, 60, t)
    expect((await hit(db, 'k', 1, 60, t + 1000)).allowed).toBe(false)
    expect((await hit(db, 'k', 1, 60, t + 61_000)).allowed).toBe(true)
  })

  it('keeps keys independent', async () => {
    const { db } = await handle
    await hit(db, 'a', 1, 60, 1)
    expect((await hit(db, 'b', 1, 60, 1)).allowed).toBe(true)
  })
})

describe('isLimited', () => {
  it('does not change state and reports blocked only when count reached max', async () => {
    const { db } = await handle
    const t = 9_000_000
    expect((await isLimited(db, 'f', 2, t)).allowed).toBe(true)
    await hit(db, 'f', 2, 3600, t)
    expect((await isLimited(db, 'f', 2, t)).allowed).toBe(true)
    await hit(db, 'f', 2, 3600, t)
    const blocked = await isLimited(db, 'f', 2, t + 1000)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfter).toBe(3599)
    const row = await db.prepare("SELECT count FROM rate_limits WHERE key='f'").first<{ count: number }>()
    expect(row?.count).toBe(2)
  })

  it('treats an expired window as not limited', async () => {
    const { db } = await handle
    await hit(db, 'g', 1, 60, 1_000)
    expect((await isLimited(db, 'g', 1, 1_000 + 61_000)).allowed).toBe(true)
  })
})
