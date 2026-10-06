import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import copy from '../copy'
import { stubApi } from '../test/stub-api'
import { useApiData } from './useApiData'

afterEach(() => vi.unstubAllGlobals())

describe('useApiData', () => {
  it('loads, then reload() refetches without going back to loading', async () => {
    stubApi({ 'GET /api/x': [{ status: 200, body: { n: 1 } }, { status: 200, body: { n: 2 } }] })
    const { result } = renderHook(() => useApiData<{ n: number }>('/api/x'))
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.data).toEqual({ n: 1 })
    await act(async () => { await result.current.reload() })
    expect(result.current.status).toBe('ready')
    expect(result.current.data).toEqual({ n: 2 })
  })

  it('reports a Persian error and the http status on failure', async () => {
    stubApi({ 'GET /api/x': { status: 404, body: { error: 'not_found' } } })
    const { result } = renderHook(() => useApiData('/api/x'))
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe(copy.errors.not_found)
    expect(result.current.httpStatus).toBe(404)
  })

  it('maps a network failure to the connection message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('x')))
    const { result } = renderHook(() => useApiData('/api/x'))
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe(copy.errors.network)
  })

  it('ignores a stale response that resolves after a newer one', async () => {
    let n = 0
    const resolvers: ((r: Response) => void)[] = []
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((res) => { n++; resolvers.push(res) })))
    const { result } = renderHook(() => useApiData<{ n: number }>('/api/x'))
    await waitFor(() => expect(n).toBe(1))
    let second!: Promise<void>
    act(() => { second = result.current.reload() })
    await waitFor(() => expect(n).toBe(2))
    const ok = (v: number) => new Response(JSON.stringify({ n: v }), { status: 200 })
    await act(async () => { resolvers[1]!(ok(2)); await second })
    await act(async () => { resolvers[0]!(ok(1)); await Promise.resolve() })
    expect(result.current.data).toEqual({ n: 2 })
  })
})
