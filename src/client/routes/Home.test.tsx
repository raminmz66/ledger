import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/Toast'
import copy from '../copy'
import { stubApi } from '../test/stub-api'
import Home from './Home'

afterEach(() => vi.unstubAllGlobals())

const list = {
  totals: { owedToMe: 12_500_000, iOwe: 3_200_000 },
  people: [
    { id: 'a', name: 'علی رضایی', balance: 8_000_000, lastActivity: '2026-10-06T10:00:00.000Z' },
    { id: 'b', name: 'مریم', balance: -3_200_000, lastActivity: '2026-10-05T10:00:00.000Z' },
    { id: 'c', name: 'سارا', balance: 0, lastActivity: '2026-10-01T10:00:00.000Z' },
  ],
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/people/:id" element={<p>PERSON PAGE</p>} />
          <Route path="/settings" element={<p>SETTINGS PAGE</p>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('Home', () => {
  it('shows both totals and each person with a signed, colored balance label', async () => {
    stubApi({ 'GET /api/people': { status: 200, body: list } })
    renderHome()
    expect(await screen.findByText('علی رضایی')).toBeInTheDocument()
    const totals = screen.getByTestId('totals')
    expect(within(totals).getByText(copy.home.totalOwedToMe)).toBeInTheDocument()
    expect(within(totals).getByText('۱۲٬۵۰۰٬۰۰۰')).toBeInTheDocument()
    expect(within(totals).getByText('۳٬۲۰۰٬۰۰۰')).toBeInTheDocument()
    const rows = screen.getAllByRole('link', { name: /علی رضایی|مریم|سارا/ })
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent(`۸٬۰۰۰٬۰۰۰ ${copy.home.owedSuffix}`)
    expect(rows[0]!.querySelector('.is-owed')).not.toBeNull()
    expect(rows[1]).toHaveTextContent(`۳٬۲۰۰٬۰۰۰ ${copy.home.oweSuffix}`)
    expect(rows[1]!.querySelector('.is-owe')).not.toBeNull()
    expect(rows[2]).toHaveTextContent(copy.home.settled)
    expect(rows[2]).toHaveAttribute('href', '/people/c')
  })

  it('shows the empty state for a new user', async () => {
    stubApi({ 'GET /api/people': { status: 200, body: { totals: { owedToMe: 0, iOwe: 0 }, people: [] } } })
    renderHome()
    expect(await screen.findByText(copy.home.emptyTitle)).toBeInTheDocument()
    expect(screen.getByText(copy.home.emptyHint)).toBeInTheDocument()
  })

  it('shows a Persian error with retry when loading fails, and recovers', async () => {
    stubApi({ 'GET /api/people': [{ status: 500, body: { error: 'internal' } }, { status: 200, body: list }] })
    renderHome()
    expect(await screen.findByText(copy.errors.internal)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: copy.common.retry }))
    expect(await screen.findByText('علی رضایی')).toBeInTheDocument()
  })

  it('adds a person through the sheet and opens their page', async () => {
    const calls = stubApi({
      'GET /api/people': { status: 200, body: list },
      'POST /api/people': { status: 201, body: { id: 'new1', name: 'رضا محمدی' } },
    })
    renderHome()
    await screen.findByText('علی رضایی')
    await userEvent.click(screen.getByRole('button', { name: copy.home.addPerson }))
    await userEvent.type(screen.getByLabelText(copy.personSheet.nameLabel), 'رضا محمدی')
    await userEvent.click(screen.getByRole('button', { name: copy.personSheet.add }))
    expect(await screen.findByText('PERSON PAGE')).toBeInTheDocument()
    expect(calls.find((c) => c.method === 'POST')!.body).toEqual({ name: 'رضا محمدی' })
  })

  it('links to settings with an accessible label', async () => {
    stubApi({ 'GET /api/people': { status: 200, body: list } })
    renderHome()
    await userEvent.click(await screen.findByRole('link', { name: copy.home.openSettings }))
    expect(await screen.findByText('SETTINGS PAGE')).toBeInTheDocument()
  })

  it('renders Latin names in an isolated direction element', async () => {
    stubApi({ 'GET /api/people': { status: 200, body: { totals: { owedToMe: 0, iOwe: 0 }, people: [{ id: 'z', name: 'John Smith', balance: 0, lastActivity: 'x' }] } } })
    renderHome()
    const name = await screen.findByText('John Smith')
    expect(name.tagName).toBe('BDI')
  })
})
