export const MAX_NAME = 60
export const MAX_NOTE = 200
export const MAX_AMOUNT = 1_000_000_000_000

export type Result<T> = { ok: true; value: T } | { ok: false; error: string }
export type TxInput = { direction: 'paid' | 'received'; amount: number; date: string; note: string | null }

export function normalizePersian(text: string): string {
  return text.replaceAll('ي', 'ی').replaceAll('ك', 'ک')
}

export function parseName(raw: unknown): Result<string> {
  if (typeof raw !== 'string') return { ok: false, error: 'invalid_name' }
  const name = normalizePersian(raw.trim())
  if (name.length < 1 || name.length > MAX_NAME) return { ok: false, error: 'invalid_name' }
  return { ok: true, value: name }
}

function isRealDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const t = new Date(Date.UTC(y, mo - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d
}

export function parseTransaction(raw: unknown): Result<TxInput> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ok: false, error: 'invalid_body' }
  const b = raw as Record<string, unknown>

  if (b.direction !== 'paid' && b.direction !== 'received') return { ok: false, error: 'invalid_direction' }
  if (typeof b.amount !== 'number' || !Number.isSafeInteger(b.amount) || b.amount < 1 || b.amount > MAX_AMOUNT) {
    return { ok: false, error: 'invalid_amount' }
  }
  if (typeof b.date !== 'string' || !isRealDate(b.date)) return { ok: false, error: 'invalid_date' }

  let note: string | null = null
  if (b.note !== undefined && b.note !== null) {
    if (typeof b.note !== 'string') return { ok: false, error: 'invalid_note' }
    const trimmed = normalizePersian(b.note.trim())
    if (trimmed.length > MAX_NOTE) return { ok: false, error: 'invalid_note' }
    note = trimmed === '' ? null : trimmed
  }
  return { ok: true, value: { direction: b.direction, amount: b.amount, date: b.date, note } }
}
