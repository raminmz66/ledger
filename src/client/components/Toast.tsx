import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

const Ctx = createContext<{ show(message: string): void }>({ show: () => {} })

export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const show = useCallback((m: string) => {
    clearTimeout(timer.current)
    setMessage(m)
    timer.current = setTimeout(() => setMessage(null), 2200)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {message !== null && <div className="toast" role="status" aria-live="polite">{message}</div>}
    </Ctx.Provider>
  )
}
