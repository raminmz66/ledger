export function safeReturnPath(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 512) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/'
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://local.invalid'
    const u = new URL(raw, base)
    if (u.origin !== new URL(base).origin) return '/'
    const path = u.pathname + u.search
    if (path === '/login' || path.startsWith('/login?') || path.startsWith('/login/')) return '/'
    return path
  } catch {
    return '/'
  }
}
