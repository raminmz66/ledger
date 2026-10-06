import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, AUTH_EXPIRED } from '../api'

type Status = 'loading' | 'anon' | 'authed'
type AuthValue = {
  status: Status
  email: string | null
  setAuthed(email: string): void
  logout(): Promise<boolean>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ status: Status; email: string | null }>({ status: 'loading', email: null })

  useEffect(() => {
    let alive = true
    api<{ email: string }>('GET', '/api/me').then((r) => {
      if (!alive) return
      // Never overwrite a sign-in that completed while /api/me was in flight.
      setState((prev) =>
        prev.status === 'authed' ? prev : r.ok && r.data ? { status: 'authed', email: r.data.email } : { status: 'anon', email: null },
      )
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const onExpired = () => setState({ status: 'anon', email: null })
    window.addEventListener(AUTH_EXPIRED, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED, onExpired)
  }, [])

  const setAuthed = useCallback((email: string) => setState({ status: 'authed', email }), [])
  const logout = useCallback(async () => {
    const r = await api('POST', '/api/auth/logout')
    if (!r.ok) return false
    setState({ status: 'anon', email: null })
    return true
  }, [])

  const value = useMemo(() => ({ ...state, setAuthed, logout }), [state, setAuthed, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}
