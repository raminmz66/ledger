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
        <Link to="/settings" className="icon-link" aria-label={copy.home.openSettings}><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm7.4-2.2c.04-.33.07-.66.07-1s-.03-.67-.07-1l2.05-1.6a.5.5 0 0 0 .12-.64l-1.94-3.36a.5.5 0 0 0-.6-.22l-2.42.97a7.5 7.5 0 0 0-1.73-1l-.37-2.57A.5.5 0 0 0 14.01 2h-3.88a.5.5 0 0 0-.49.42l-.37 2.57c-.62.25-1.2.58-1.73 1l-2.42-.97a.5.5 0 0 0-.6.22L2.58 8.6a.5.5 0 0 0 .12.64L4.75 10.84c-.04.33-.07.66-.07 1s.03.67.07 1l-2.05 1.6a.5.5 0 0 0-.12.64l1.94 3.36c.13.22.4.3.6.22l2.42-.97c.53.42 1.11.75 1.73 1l.37 2.57c.04.24.25.42.49.42h3.88c.24 0 .45-.18.49-.42l.37-2.57c.62-.25 1.2-.58 1.73-1l2.42.97c.22.09.47 0 .6-.22l1.94-3.36a.5.5 0 0 0-.12-.64L19.4 13Z"/></svg></Link>
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
              <span className="total-amount"><strong className="is-owed">{formatToman(data.totals.owedToMe)}</strong> <small className="total-unit">{copy.common.toman}</small></span>
            </div>
            <div className="card total-card">
              <span className="total-label">{copy.home.totalIOwe}</span>
              <span className="total-amount"><strong className="is-owe">{formatToman(data.totals.iOwe)}</strong> <small className="total-unit">{copy.common.toman}</small></span>
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
