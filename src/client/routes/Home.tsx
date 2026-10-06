import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { PersonRow } from '../components/PersonRow'
import { PersonSheet } from '../components/PersonSheet'
import copy from '../copy'
import { useApiData } from '../data/useApiData'
import { formatToman } from '../format/money'
import type { PeopleList } from '../types'

export default function Home() {
  const { status, data, error, reload } = useApiData<PeopleList>('/api/people')
  const [adding, setAdding] = useState(false)
  const navigate = useNavigate()

  return (
    <main className="page home">
      <header className="home-header">
        <h1 className="home-title">{copy.appName}</h1>
        <Link to="/settings" className="icon-link" aria-label={copy.home.openSettings}>⚙</Link>
      </header>
      {status === 'loading' && <p className="page-loading">{copy.loading}</p>}
      {status === 'error' && !data && (
        <div className="page-loading">
          <p className="form-error">{error}</p>
          <button type="button" className="btn btn--ghost" onClick={() => void reload()}>{copy.common.retry}</button>
        </div>
      )}
      {status === 'error' && data && (
        <div className="page-loading">
          <p className="form-error" role="alert">{error}</p>
          <button type="button" className="btn btn--ghost" onClick={() => void reload()}>{copy.common.retry}</button>
        </div>
      )}
      {data && (
        <>
          <div className="totals" data-testid="totals">
            <div className="card total-card">
              <span className="total-label">{copy.home.totalOwedToMe}</span>
              <strong className="is-owed">{formatToman(data.totals.owedToMe)}</strong>
            </div>
            <div className="card total-card">
              <span className="total-label">{copy.home.totalIOwe}</span>
              <strong className="is-owe">{formatToman(data.totals.iOwe)}</strong>
            </div>
          </div>
          {data.people.length === 0 ? (
            <div className="page-loading">
              <p><strong>{copy.home.emptyTitle}</strong></p>
              <p>{copy.home.emptyHint}</p>
            </div>
          ) : (
            <div className="card people-list">
              {data.people.map((p) => <PersonRow key={p.id} id={p.id} name={p.name} balance={p.balance} />)}
            </div>
          )}
        </>
      )}
      <button type="button" className="fab" onClick={() => setAdding(true)}>{copy.home.addPerson}</button>
      <PersonSheet open={adding} mode="add" onClose={() => setAdding(false)} onDone={(p) => { setAdding(false); navigate(`/people/${encodeURIComponent(p.id)}`) }} />
    </main>
  )
}
