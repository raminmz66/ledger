const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  if (email.length === 0 || email.length > 254 || !EMAIL_RE.test(email)) return null
  return email
}

/** Persian (U+06F0–9) and Arabic-Indic (U+0660–9) digits → Latin. */
function toLatinDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (ch) => {
    const code = ch.charCodeAt(0)
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660)
  })
}

export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const code = toLatinDigits(raw).replace(/[\s​-‏]/g, '')
  return /^\d{6}$/.test(code) ? code : null
}
