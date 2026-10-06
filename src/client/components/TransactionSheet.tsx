import dayjs from 'dayjs'
import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '../api'
import copy from '../copy'
import { formatGregorianToJalali, formatJalali, todayGregorian } from '../dates/jalali'
import { errorMessage } from '../errors'
import { toFaDigits } from '../format/digits'
import { numberToWordsFa } from '../format/words-fa'
import { validateTransaction } from '../validation'
import { AmountField } from './AmountField'
import { ConfirmPress } from './ConfirmPress'
import { JalaliCalendarSheet } from './JalaliCalendarSheet'
import { SegmentedControl } from './SegmentedControl'
import { Sheet } from './Sheet'
import { useToast } from './Toast'

type Direction = 'paid' | 'received'
type Tx = { id: string; direction: Direction; amount: number; date: string; note: string | null }

export type TransactionSheetProps = (
  | { mode: 'add'; direction: Direction }
  | { mode: 'edit'; tx: Tx }
) & { open: boolean; personId: string; personName: string; onClose: () => void; onSaved: () => void }

const yesterday = () => dayjs(todayGregorian()).subtract(1, 'day').format('YYYY-MM-DD')

export function TransactionSheet(props: TransactionSheetProps) {
  const { open, personId, personName, onClose, onSaved } = props
  const tx = props.mode === 'edit' ? props.tx : null
  const initDirection = props.mode === 'add' ? props.direction : props.tx.direction
  const [direction, setDirection] = useState<Direction>(initDirection)
  const [amount, setAmount] = useState(tx ? String(tx.amount) : '')
  const [date, setDate] = useState(tx?.date ?? todayGregorian())
  const [note, setNote] = useState(tx?.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [calendar, setCalendar] = useState(false)
  const toast = useToast()
  const txId = tx?.id
  const form = useRef<HTMLFormElement>(null)

  // Runs after Sheet's own first-focusable focus (child effects run first).
  useEffect(() => {
    if (open) form.current?.querySelector<HTMLInputElement>('input[inputmode="numeric"]')?.focus()
  }, [open, txId])

  useEffect(() => {
    if (!open) return
    setDirection(initDirection)
    setAmount(tx ? String(tx.amount) : '')
    setDate(tx?.date ?? todayGregorian())
    setNote(tx?.note ?? '')
    setError(null)
    setCalendar(false)
    // Re-initialize on reopen or when another transaction is edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, txId, initDirection])

  async function finish(res: Awaited<ReturnType<typeof api>>, message: string) {
    setBusy(false)
    if (!res.ok) return setError(errorMessage(res as { status: number; data: { error?: string } | null }))
    onSaved()
    toast.show(message)
    onClose()
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    const v = validateTransaction({ direction, amount, date, note })
    if (!v.ok) return setError(copy.errors[v.error])
    setError(null)
    setBusy(true)
    const res = tx
      ? await api('PATCH', `/api/transactions/${tx.id}`, v.value)
      : await api('POST', `/api/people/${personId}/transactions`, v.value)
    await finish(res, copy.toast.saved)
  }

  async function remove() {
    if (!tx || busy) return
    setError(null)
    setBusy(true)
    await finish(await api('DELETE', `/api/transactions/${tx.id}`), copy.toast.deleted)
  }

  const n = amount === '' ? NaN : Number(amount)
  const words = Number.isInteger(n) && n > 0 && n <= 1e12 ? `${numberToWordsFa(n)} ${copy.common.toman}` : null
  const isToday = date === todayGregorian()
  const isYesterday = date === yesterday()
  const chip = (on: boolean) => (on ? 'chip chip--on' : 'chip')

  return (
    <Fragment>
      <Sheet open={open} title={tx ? copy.txSheet.editTitle : `${copy.txSheet.addTitle} ${personName}`} onClose={onClose} busy={busy}>
        <form ref={form} className="sheet-form" onSubmit={submit} noValidate>
          <SegmentedControl
            options={[{ value: 'paid', label: copy.person.paidButton }, { value: 'received', label: copy.person.receivedButton }]}
            value={direction}
            onChange={setDirection}
            disabled={busy}
          />
          <label className="field">
            {copy.txSheet.amountLabel}
            <AmountField value={amount} onChange={setAmount} disabled={busy} />
          </label>
          {words && <p className="amount-words">{words}</p>}
          <div className="field">
            {copy.txSheet.dateLabel}
            <div className="chips">
              <button type="button" className={chip(isToday)} aria-pressed={isToday} disabled={busy} onClick={() => setDate(todayGregorian())}>{copy.txSheet.today}</button>
              <button type="button" className={chip(isYesterday)} aria-pressed={isYesterday} disabled={busy} onClick={() => setDate(yesterday())}>{copy.txSheet.yesterday}</button>
              <button type="button" className={chip(!isToday && !isYesterday)} aria-pressed={!isToday && !isYesterday} disabled={busy} onClick={() => setCalendar(true)}>
                {isToday || isYesterday ? copy.txSheet.pickDate : toFaDigits(formatGregorianToJalali(date))}
              </button>
            </div>
            <span className="date-jalali">{formatJalali(date)}</span>
          </div>
          <label className="field">
            {copy.txSheet.noteLabel}
            <input type="text" value={note} placeholder={copy.txSheet.notePlaceholder} disabled={busy} autoComplete="off" onChange={(e) => setNote(e.target.value)} />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>{tx ? copy.txSheet.saveChanges : copy.txSheet.save}</button>
          {tx && <ConfirmPress className="btn btn--ghost btn--danger" label={copy.txSheet.deleteTx} confirmLabel={copy.txSheet.deleteConfirm} disabled={busy} onConfirm={remove} />}
        </form>
      </Sheet>
      <JalaliCalendarSheet open={open && calendar} value={date} onPick={setDate} onClose={() => setCalendar(false)} />
    </Fragment>
  )
}
