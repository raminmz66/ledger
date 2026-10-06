export type Limit = { allowed: boolean; retryAfter: number }

const secondsUntil = (resetIso: string, nowMs: number) =>
  Math.max(1, Math.ceil((Date.parse(resetIso) - nowMs) / 1000))

export async function hit(
  db: D1Database,
  key: string,
  max: number,
  windowSec: number,
  nowMs: number = Date.now(),
): Promise<Limit> {
  const now = new Date(nowMs).toISOString()
  const resetAt = new Date(nowMs + windowSec * 1000).toISOString()
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (key, count, reset_at) VALUES (?1, 1, ?2)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN reset_at <= ?3 THEN 1 ELSE count + 1 END,
         reset_at = CASE WHEN reset_at <= ?3 THEN ?2 ELSE reset_at END
       RETURNING count, reset_at`,
    )
    .bind(key, resetAt, now)
    .first<{ count: number; reset_at: string }>()
  if (!row) throw new Error('rate_limits upsert returned no row')
  return { allowed: row.count <= max, retryAfter: secondsUntil(row.reset_at, nowMs) }
}

export async function isLimited(
  db: D1Database,
  key: string,
  max: number,
  nowMs: number = Date.now(),
): Promise<Limit> {
  const row = await db
    .prepare('SELECT count, reset_at FROM rate_limits WHERE key = ?')
    .bind(key)
    .first<{ count: number; reset_at: string }>()
  if (!row || Date.parse(row.reset_at) <= nowMs || row.count < max) {
    return { allowed: true, retryAfter: 0 }
  }
  return { allowed: false, retryAfter: secondsUntil(row.reset_at, nowMs) }
}
