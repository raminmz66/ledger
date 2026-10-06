import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import copy from '../copy'

const FOCUSABLE = 'input, button, a[href], select, textarea, [tabindex]:not([tabindex="-1"])'

// Open sheets, oldest first: only the topmost reacts to Escape.
const stack: object[] = []

export type SheetProps = { open: boolean; title: string; onClose: () => void; busy?: boolean; returnFocusRef?: RefObject<HTMLElement | null>; children: ReactNode }

export function Sheet({ open, title, onClose, busy = false, returnFocusRef, children }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null)
  const guard = useRef({ busy, onClose, returnFocusRef })
  guard.current = { busy, onClose, returnFocusRef }

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    // The close button is last in DOM order, so the first field wins.
    panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    const token = {}
    stack.push(token)
    document.getElementById('root')?.setAttribute('inert', '')
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token) return
      if (e.key === 'Escape' && !guard.current.busy) guard.current.onClose()
      if (e.key !== 'Tab' || !panel.current) return
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !(el as HTMLButtonElement).disabled)
      if (!items.length) return e.preventDefault()
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === panel.current || !panel.current.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !panel.current.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      const i = stack.indexOf(token)
      if (i >= 0) stack.splice(i, 1)
      if (!stack.length) document.getElementById('root')?.removeAttribute('inert')
      const back = guard.current.returnFocusRef?.current
      if (back?.isConnected) back.focus()
      else if (opener?.isConnected) opener.focus()
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="sheet-shade" data-testid="sheet-shade" onClick={() => { if (!busy) onClose() }}>
      <div ref={panel} className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" aria-hidden="true" />
        <h2 className="sheet-title">{title}</h2>
        {children}
        <button type="button" className="btn btn--ghost sheet-close" disabled={busy} onClick={onClose}>{copy.common.close}</button>
      </div>
    </div>,
    document.body,
  )
}
