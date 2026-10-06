export async function cleanupExpired(
  db: D1Database,
  nowMs: number = Date.now(),
): Promise<{ codes: number; sessions: number; limits: number }> {
  const now = new Date(nowMs).toISOString()
  const [codes, sessions, limits] = await db.batch([
    db.prepare('DELETE FROM login_codes WHERE expires_at <= ?').bind(now),
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now),
    db.prepare('DELETE FROM rate_limits WHERE reset_at <= ?').bind(now),
  ])
  return {
    codes: codes!.meta.changes ?? 0,
    sessions: sessions!.meta.changes ?? 0,
    limits: limits!.meta.changes ?? 0,
  }
}
