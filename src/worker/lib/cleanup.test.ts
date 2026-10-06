// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest'
import { createTestDb } from '../test/db'
import { cleanupExpired } from './cleanup'

const handle = createTestDb()
afterAll(async () => (await handle).dispose())

describe('cleanupExpired', () => {
  it('deletes only expired rows and reports counts', async () => {
    const { db } = await handle
    const now = Date.parse('2026-10-06T12:00:00Z')
    const past = '2026-10-06T11:00:00.000Z'
    const future = '2026-10-06T13:00:00.000Z'
    await db.prepare("INSERT INTO users (id,email,created_at) VALUES ('u','u@b.co','x')").run()
    await db.batch([
      db.prepare('INSERT INTO login_codes (email,code_hash,expires_at) VALUES (?,?,?)').bind('old@b.co', 'h', past),
      db.prepare('INSERT INTO login_codes (email,code_hash,expires_at) VALUES (?,?,?)').bind('new@b.co', 'h', future),
      db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').bind('s1', 'u', past),
      db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').bind('s2', 'u', future),
      db.prepare('INSERT INTO rate_limits (key,count,reset_at) VALUES (?,?,?)').bind('k1', 1, past),
      db.prepare('INSERT INTO rate_limits (key,count,reset_at) VALUES (?,?,?)').bind('k2', 1, future),
    ])
    expect(await cleanupExpired(db, now)).toEqual({ codes: 1, sessions: 1, limits: 1 })
    const left = async (t: string) => (await db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first<{ n: number }>())!.n
    expect([await left('login_codes'), await left('sessions'), await left('rate_limits')]).toEqual([1, 1, 1])
  })
})
