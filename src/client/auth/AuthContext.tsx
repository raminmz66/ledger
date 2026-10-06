import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../api'

type Status = 'loading' | 'anon' | 'authed'
type AuthValue = {
  status: Status
  email: string | null
  setAuthed(email: string): void
  logout(): Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ status: Status; email: string | null }>({ status: 'loading', email: null })

  useEffect(() => {
    let alive = true
    api<{ email: string }>('GET', '/api/me').then((r) => {
      if (!alive) return
      setState(r.ok && r.data ? { status: 'authed', email: r.data.email } : { status: 'anon', email: null })
    })
    return () => { alive = false }
  }, [])

  const setAuthed = useCallback((email: string) => setState({ status: 'authed', email }), [])
  const logout = useCallback(async () => {
    await api('POST', '/api/auth/logout')
    setState({ status: 'anon', email: null })
  }, [])

  const value = useMemo(() => ({ ...state, setAuthed, logout }), [state, setAuthed, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}
