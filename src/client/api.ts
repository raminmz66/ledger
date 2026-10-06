export type ApiResult<T> = { ok: boolean; status: number; data: T | null }

export async function api<T = unknown>(
  method: 'GET' | 'POST',
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
    const text = await res.text()
    return { ok: res.ok, status: res.status, data: text ? (JSON.parse(text) as T) : null }
  } catch {
    return { ok: false, status: 0, data: null }
  }
}
