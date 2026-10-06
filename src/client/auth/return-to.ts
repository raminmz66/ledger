export function safeReturnPath(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 512) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/'
  if (raw === '/login' || raw.startsWith('/login?') || raw.startsWith('/login/')) return '/'
  return raw
}
