import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { errorMessage } from '../errors'

type State<T> = { status: 'loading' | 'ready' | 'error'; data: T | null; error: string | null; httpStatus: number | null }

export function useApiData<T>(path: string) {
  const [state, setState] = useState<State<T>>({ status: 'loading', data: null, error: null, httpStatus: null })
  // Sequence counter: only the newest request may write state (also covers unmount / path change).
  const seq = useRef(0)

  const load = useCallback(async () => {
    const my = ++seq.current
    const res = await api<T>('GET', path)
    if (my !== seq.current) return
    if (res.ok) setState({ status: 'ready', data: res.data, error: null, httpStatus: res.status })
    else setState((prev) => ({ status: 'error', data: prev.data, error: errorMessage(res as { status: number; data: { error?: string } | null }), httpStatus: res.status }))
  }, [path])

  useEffect(() => {
    setState({ status: 'loading', data: null, error: null, httpStatus: null })
    void load()
    return () => { seq.current++ }
  }, [load])

  return { ...state, reload: load }
}
