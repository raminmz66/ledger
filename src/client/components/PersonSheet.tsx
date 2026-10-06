import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api'
import copy from '../copy'
import { errorMessage } from '../errors'
import { validateName } from '../validation'
import { Sheet } from './Sheet'
import { useToast } from './Toast'

export type PersonSheetProps = (
  | { mode: 'add' }
  | { mode: 'rename'; personId: string; initialName: string }
) & { open: boolean; onClose: () => void; onDone: (person: { id: string; name: string }) => void }

export function PersonSheet(props: PersonSheetProps) {
  const { open, onClose, onDone } = props
  const initial = props.mode === 'rename' ? props.initialName : ''
  const [name, setName] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (open) { setName(initial); setError(null) }
  }, [open, initial])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    const v = validateName(name)
    if (!v.ok) return setError(copy.errors[v.error])
    setError(null)
    setBusy(true)
    const res = props.mode === 'add'
      ? await api<{ id: string; name: string }>('POST', '/api/people', { name: v.value })
      : await api<{ id: string; name: string }>('PATCH', `/api/people/${props.personId}`, { name: v.value })
    setBusy(false)
    if (!res.ok || !res.data) return setError(errorMessage(res as { status: number; data: { error?: string } | null }))
    toast.show(copy.toast.saved)
    onDone({ id: res.data.id, name: res.data.name })
  }

  return (
    <Sheet open={open} title={props.mode === 'add' ? copy.personSheet.addTitle : copy.personSheet.renameTitle} onClose={onClose} busy={busy}>
      <form className="sheet-form" onSubmit={submit} noValidate>
        <label className="field">
          {copy.personSheet.nameLabel}
          <input type="text" dir="auto" value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>
          {props.mode === 'add' ? copy.personSheet.add : copy.personSheet.save}
        </button>
      </form>
    </Sheet>
  )
}
