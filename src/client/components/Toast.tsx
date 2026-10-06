import { createPortal } from 'react-dom'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type Tone = 'info' | 'error'

const Ctx = createContext<{ show(message: string, tone?: Tone): void }>({ show: () => {} })

export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: Tone } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const show = useCallback((message: string, tone: Tone = 'info') => {
    clearTimeout(timer.current)
    setToast({ message, tone })
    timer.current = setTimeout(() => setToast(null), tone === 'error' ? 4000 : 2200)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {createPortal(
      <div className="toast-region">
        <div role="status" aria-live="polite">
          {toast?.tone === 'info' && <p className="toast">{toast.message}</p>}
        </div>
        <div role="alert">
          {toast?.tone === 'error' && <p className="toast toast--error">{toast.message}</p>}
        </div>
      </div>,
      document.body,
      )}
    </Ctx.Provider>
  )
}
