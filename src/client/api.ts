export const AUTH_EXPIRED = 'auth:expired'

export type ApiResult<T> = { ok: boolean; status: number; data: T | null }

export async function api<T = unknown>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method,
      credentials: 'same-origin',
      // Always sent: the Worker's CSRF check relies on it, even for bodiless POSTs.
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (res.status === 401 && path !== '/api/me' && !path.startsWith('/api/auth/')) {
      window.dispatchEvent(new Event(AUTH_EXPIRED))
    }
    const text = await res.text()
    let data: T | null = null
    try {
      data = text ? (JSON.parse(text) as T) : null
    } catch {
      // Non-JSON body (CSRF text, proxy HTML): keep the real status.
    }
    return { ok: res.ok, status: res.status, data }
  } catch {
    return { ok: false, status: 0, data: null }
  }
}
