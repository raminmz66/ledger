import { vi } from 'vitest'

export type Reply = { status: number; body?: unknown }
export type Handler = Reply | ((body: any) => Reply)

/** Stubs global fetch. Keys are `"METHOD /path"`. Arrays are consumed in order (the last one repeats). */
export function stubApi(routes: Record<string, Handler | Handler[]>) {
  const calls: { method: string; url: string; body: any }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      const body = init?.body ? JSON.parse(init.body as string) : undefined
      calls.push({ method, url, body })
      let h = routes[`${method} ${url}`]
      if (h === undefined) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 })
      if (Array.isArray(h)) h = h.length > 1 ? h.shift()! : h[0]!
      const r = typeof h === 'function' ? h(body) : h
      return new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status })
    }),
  )
  return calls
}
