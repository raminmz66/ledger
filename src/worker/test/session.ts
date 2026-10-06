import { randomToken, sha256Hex } from '../lib/crypto'

export async function createSession(
  db: D1Database,
  email: string,
  nowMs: number = Date.now(),
): Promise<{ userId: string; cookie: string }> {
  const normalized = email.trim().toLowerCase()
  await db
    .prepare('INSERT OR IGNORE INTO users (id, email, created_at) VALUES (?, ?, ?)')
    .bind(crypto.randomUUID(), normalized, new Date(nowMs).toISOString())
    .run()
  const user = await db.prepare('SELECT id FROM users WHERE email = ?').bind(normalized).first<{ id: string }>()
  const token = randomToken()
  await db
    .prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await sha256Hex(token), user!.id, new Date(nowMs + 30 * 86_400_000).toISOString())
    .run()
  return { userId: user!.id, cookie: `sid=${token}` }
}
