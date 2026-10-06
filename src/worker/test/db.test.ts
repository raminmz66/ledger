// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest'
import { createTestDb } from './db'

describe('createTestDb', () => {
  const handle = createTestDb()
  afterAll(async () => (await handle).dispose())

  it('applies the migrations: all six tables exist and constraints hold', async () => {
    const { db } = await handle
    const rows = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'sqlite_%'").all<{ name: string }>()
    const names = rows.results.map((r) => r.name)
    for (const t of ['users', 'people', 'transactions', 'login_codes', 'sessions', 'rate_limits']) {
      expect(names).toContain(t)
    }
    await expect(
      db.prepare("INSERT INTO users (id,email,created_at) VALUES ('1','a@b.co','x'),('2','a@b.co','x')").run(),
    ).rejects.toThrow()
  })
})
