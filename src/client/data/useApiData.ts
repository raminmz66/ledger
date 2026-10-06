import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { errorMessage } from '../errors'

type State<T> = { status: 'loading' | 'ready' | 'error'; data: T | null; error: string | null; httpStatus: number | null }

export function useApiData<T>(path: string | null) {
  const [state, setState] = useState<State<T>>({ status: 'loading', data: null, error: null, httpStatus: null })
  const alive = useRef(true)

  const load = useCallback(async () => {
    if (path === null) return
    const res = await api<T>('GET', path)
    if (!alive.current) return
    if (res.ok) setState({ status: 'ready', data: res.data, error: null, httpStatus: res.status })
    else setState((prev) => ({ status: 'error', data: prev.data, error: errorMessage(res as { status: number; data: { error?: string } | null }), httpStatus: res.status }))
  }, [path])

  useEffect(() => {
    alive.current = true
    setState({ status: 'loading', data: null, error: null, httpStatus: null })
    void load()
    return () => { alive.current = false }
  }, [load])

  return { ...state, reload: load }
}
