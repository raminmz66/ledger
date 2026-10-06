const MAX_NAME = 60
const MAX_NOTE = 200
const MAX_AMOUNT = 1_000_000_000_000

// Mirrors the Worker (src/worker/lib/ledger-validate.ts): strip invisible/whitespace edges, keep inner ZWNJ.
const strip = (t: string) => t.replace(/^[\p{Cc}\p{Cf}\s]+|[\p{Cc}\p{Cf}\s]+$/gu, '')
const normalize = (t: string) => t.replaceAll('ي', 'ی').replaceAll('ك', 'ک')

export function validateName(raw: string): { ok: true; value: string } | { ok: false; error: 'invalid_name' } {
  const name = normalize(strip(raw))
  return name.length >= 1 && name.length <= MAX_NAME ? { ok: true, value: name } : { ok: false, error: 'invalid_name' }
}

function isRealDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const t = new Date(Date.UTC(y, mo - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d
}

export type TxValue = { direction: 'paid' | 'received'; amount: number; date: string; note: string | null }

export function validateTransaction(input: {
  direction: 'paid' | 'received'
  amount: string
  date: string
  note: string
}): { ok: true; value: TxValue } | { ok: false; error: 'invalid_amount' | 'invalid_date' | 'invalid_note' } {
  const amount = input.amount === '' ? 0 : Number(input.amount)
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > MAX_AMOUNT) return { ok: false, error: 'invalid_amount' }
  if (!isRealDate(input.date)) return { ok: false, error: 'invalid_date' }
  const note = normalize(strip(input.note))
  if (note.length > MAX_NOTE) return { ok: false, error: 'invalid_note' }
  return { ok: true, value: { direction: input.direction, amount, date: input.date, note: note === '' ? null : note } }
}
