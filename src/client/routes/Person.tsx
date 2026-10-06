import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { api } from '../api'
import { BackButton } from '../components/BackButton'
import { ConfirmPress } from '../components/ConfirmPress'
import { PersonSheet } from '../components/PersonSheet'
import { TransactionSheet } from '../components/TransactionSheet'
import { useToast } from '../components/Toast'
import copy from '../copy'
import { useApiData } from '../data/useApiData'
import { groupByDate } from '../dates/group'
import { formatJalali } from '../dates/jalali'
import { errorMessage } from '../errors'
import { toFaDigits } from '../format/digits'
import { balanceView, formatToman, signedToman } from '../format/money'

type Direction = 'paid' | 'received'
type Tx = { id: string; direction: Direction; amount: number; date: string; note: string | null }
type PersonDetail = { id: string; name: string; balance: number; transactions: Tx[] }
type TxSheetState = { mode: 'add'; direction: Direction } | { mode: 'edit'; tx: Tx } | null

export default function Person() {
  const { id = '' } = useParams()
  const eid = encodeURIComponent(id)
  const { status, data, error, httpStatus, reload } = useApiData<PersonDetail>(`/api/people/${eid}`)
  const [txSheet, setTxSheet] = useState<TxSheetState>(null)
  const [renaming, setRenaming] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [armed, setArmed] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const menuBtn = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenuOpen(false); menuBtn.current?.focus() } }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  if (!data) {
    if (status === 'loading') return <main className="page"><p className="page-loading">{copy.loading}</p></main>
    return (
      <main className="page">
        <div className="page-loading">
          {httpStatus === 404 ? (
            <>
              <p>{copy.person.notFound}</p>
              <Link to="/">{copy.person.backHome}</Link>
            </>
          ) : (
            <>
              <p className="form-error">{error}</p>
              <button type="button" className="btn btn--ghost" onClick={() => void reload()}>{copy.common.retry}</button>
            </>
          )}
        </div>
      </main>
    )
  }

  const { kind, amount } = balanceView(data.balance)
  const n = data.transactions.length
  const label = kind === 'owed' ? copy.person.owedToMe : kind === 'owe' ? copy.person.iOwe : copy.person.settled

  async function remove() {
    if (deleting) return
    setDeleting(true)
    const res = await api('DELETE', `/api/people/${eid}`)
    if (!res.ok) {
      setDeleting(false)
      return toast.show(errorMessage(res as { status: number; data: { error?: string } | null }), 'error')
    }
    toast.show(copy.toast.deleted)
    navigate('/', { replace: true })
  }

  return (
    <main className="page person">
      <header className="person-header">
        <BackButton fallbackTo="/" />
        <h1 className="person-name"><bdi>{data.name}</bdi></h1>
        <div className="person-menu" ref={menuRef}>
          <button type="button" ref={menuBtn} className="icon-link" aria-label={copy.person.menu} aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>⋯</button>
          {menuOpen && (
            <div className="card menu-pop">
              <button type="button" className="menu-item" onClick={() => { setMenuOpen(false); setRenaming(true) }}>{copy.person.rename}</button>
              <ConfirmPress className="menu-item menu-item--danger" label={copy.person.deletePerson} disabled={deleting} confirmLabel={copy.person.deleteConfirm} onArmedChange={setArmed} onConfirm={() => void remove()} />
              {armed && (
                <p className="menu-warn">{n === 0 ? copy.person.deleteWarnNone : <>«<bdi>{data.name}</bdi>» {copy.person.deleteWarnAnd} {toFaDigits(n)} {copy.person.deleteWarnTail}</>}</p>
              )}
            </div>
          )}
        </div>
      </header>

      {status === 'error' && (
        <div className="page-loading">
          <p className="form-error" role="alert">{error}</p>
          <button type="button" className="btn btn--ghost" onClick={() => void reload()}>{copy.common.retry}</button>
        </div>
      )}

      <section className="balance-block">
        <span className={`is-${kind}`}>{label}</span>
        <strong className={`balance-amount is-${kind}`} data-testid="balance">{formatToman(amount)} <small>{copy.common.toman}</small></strong>
      </section>

      <div className="person-actions">
        <button type="button" className="btn" onClick={() => setTxSheet({ mode: 'add', direction: 'paid' })}>{copy.person.paidButton}</button>
        <button type="button" className="btn btn--ghost" onClick={() => setTxSheet({ mode: 'add', direction: 'received' })}>{copy.person.receivedButton}</button>
      </div>

      {n === 0 ? (
        <p className="page-loading">{copy.person.noTransactions}</p>
      ) : (
        groupByDate(data.transactions).map((g) => (
          <section key={g.date} data-testid="day-group">
            <h2 className="day-header">{formatJalali(g.date)}</h2>
            <div className="card">
              {g.items.map((t) => (
                <button key={t.id} type="button" className="list-row tx-row" onClick={() => setTxSheet({ mode: 'edit', tx: t })}>
                  <span>{t.direction === 'paid' ? copy.person.paid : copy.person.received}{t.note && <> · <bdi>{t.note}</bdi></>}</span>
                  <bdi dir="ltr" className={t.direction === 'paid' ? 'is-owed' : 'is-owe'}>{signedToman(t.direction, t.amount)}</bdi>
                </button>
              ))}
            </div>
          </section>
        ))
      )}

      {txSheet && (
        <TransactionSheet {...txSheet} open personId={eid} personName={data.name} onClose={() => setTxSheet(null)} onSaved={() => void reload()} />
      )}
      <PersonSheet mode="rename" open={renaming} personId={eid} initialName={data.name} onClose={() => { setRenaming(false); menuBtn.current?.focus() }} onDone={() => { setRenaming(false); menuBtn.current?.focus(); void reload() }} />
    </main>
  )
}
