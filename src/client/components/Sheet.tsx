import { useEffect, useRef, type ReactNode } from 'react'
import copy from '../copy'

const FOCUSABLE = 'input, button, [href], select, textarea, [tabindex]:not([tabindex="-1"])'

export type SheetProps = { open: boolean; title: string; onClose: () => void; busy?: boolean; children: ReactNode }

export function Sheet({ open, title, onClose, busy = false, children }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null)
  const guard = useRef({ busy, onClose })
  guard.current = { busy, onClose }

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    // The close button is last in DOM order, so the first field wins.
    panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !guard.current.busy) guard.current.onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener?.focus()
    }
  }, [open])

  if (!open) return null
  return (
    <div className="sheet-shade" data-testid="sheet-shade" onClick={() => { if (!busy) onClose() }}>
      <div ref={panel} className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" aria-hidden="true" />
        <h2 className="sheet-title">{title}</h2>
        {children}
        <button type="button" className="btn btn--ghost sheet-close" disabled={busy} onClick={onClose}>{copy.common.close}</button>
      </div>
    </div>
  )
}
