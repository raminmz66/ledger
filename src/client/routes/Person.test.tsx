import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/Toast'
import copy from '../copy'
import { stubApi } from '../test/stub-api'
import Person from './Person'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-08T10:00:00'))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const detail = {
  id: 'p1',
  name: 'علی رضایی',
  balance: 8_000_000,
  transactions: [
    { id: 't3', direction: 'paid', amount: 500_000, date: '2026-10-06', note: 'سهم شام' },
    { id: 't2', direction: 'received', amount: 2_000_000, date: '2026-10-06', note: null },
    { id: 't1', direction: 'paid', amount: 10_000_000, date: '2026-09-20', note: 'قرض ماشین' },
  ],
}

function renderPerson() {
  return render(
    <MemoryRouter initialEntries={['/people/p1']}>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<p>HOME PAGE</p>} />
          <Route path="/people/:id" element={<Person />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('Person page', () => {
  it('shows the name, the balance with its label, and both action buttons', async () => {
    stubApi({ 'GET /api/people/p1': { status: 200, body: detail } })
    renderPerson()
    expect(await screen.findByRole('heading', { name: 'علی رضایی' })).toBeInTheDocument()
    expect(screen.getByText(copy.person.owedToMe)).toBeInTheDocument()
    expect(screen.getByTestId('balance')).toHaveTextContent('۸٬۰۰۰٬۰۰۰')
    expect(screen.getByRole('button', { name: copy.person.paidButton })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.person.receivedButton })).toBeInTheDocument()
  })

  it('labels a negative balance as «به او بدهکارم» and zero as settled', async () => {
    stubApi({ 'GET /api/people/p1': { status: 200, body: { ...detail, balance: -3_200_000 } } })
    const { unmount } = renderPerson()
    expect(await screen.findByText(copy.person.iOwe)).toBeInTheDocument()
    expect(screen.getByTestId('balance')).toHaveTextContent('۳٬۲۰۰٬۰۰۰')
    unmount()
    stubApi({ 'GET /api/people/p1': { status: 200, body: { ...detail, balance: 0 } } })
    renderPerson()
    expect(await screen.findByText(copy.person.settled)).toBeInTheDocument()
  })

  it('groups the history by Jalali day in server order with signed amounts', async () => {
    stubApi({ 'GET /api/people/p1': { status: 200, body: detail } })
    renderPerson()
    await screen.findByRole('heading', { name: 'علی رضایی' })
    const groups = screen.getAllByTestId('day-group')
    expect(groups).toHaveLength(2)
    expect(within(groups[0]!).getByText('۱۴ مهر ۱۴۰۵')).toBeInTheDocument() // 2026-10-06
    expect(within(groups[1]!).getByText(/مهر ۱۴۰۵|شهریور ۱۴۰۵/)).toBeInTheDocument()
    const rows = within(groups[0]!).getAllByRole('button')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('+۵۰۰٬۰۰۰')
    expect(rows[0]).toHaveTextContent(`${copy.person.paid} · سهم شام`)
    expect(rows[1]).toHaveTextContent('−۲٬۰۰۰٬۰۰۰')
    expect(rows[1]).toHaveTextContent(copy.person.received)
  })

  it('shows the empty-history message', async () => {
    stubApi({ 'GET /api/people/p1': { status: 200, body: { ...detail, balance: 0, transactions: [] } } })
    renderPerson()
    expect(await screen.findByText(copy.person.noTransactions)).toBeInTheDocument()
  })

  it('«پرداخت کردم» opens the sheet preset to paid; saving refetches the page', async () => {
    const calls = stubApi({
      'GET /api/people/p1': [{ status: 200, body: detail }, { status: 200, body: { ...detail, balance: 8_000_100 } }],
      'POST /api/people/p1/transactions': { status: 201, body: { id: 'tNew' } },
    })
    renderPerson()
    await screen.findByRole('heading', { name: 'علی رضایی' })
    await userEvent.click(screen.getByRole('button', { name: copy.person.paidButton }))
    expect(screen.getByRole('radio', { name: copy.person.paidButton })).toHaveAttribute('aria-checked', 'true')
    await userEvent.type(screen.getByLabelText(copy.txSheet.amountLabel), '100')
    await userEvent.click(screen.getByRole('button', { name: copy.txSheet.save }))
    await waitFor(() => expect(screen.getByTestId('balance')).toHaveTextContent('۸٬۰۰۰٬۱۰۰'))
    expect(calls.filter((c) => c.method === 'GET')).toHaveLength(2)
  })

  it('«دریافت کردم» opens the sheet preset to received', async () => {
    stubApi({ 'GET /api/people/p1': { status: 200, body: detail } })
    renderPerson()
    await screen.findByRole('heading', { name: 'علی رضایی' })
    await userEvent.click(screen.getByRole('button', { name: copy.person.receivedButton }))
    expect(screen.getAllByRole('radio', { name: copy.person.receivedButton })[0]).toHaveAttribute('aria-checked', 'true')
  })

  it('tapping a row opens the edit sheet prefilled', async () => {
    stubApi({ 'GET /api/people/p1': { status: 200, body: detail } })
    renderPerson()
    await screen.findByRole('heading', { name: 'علی رضایی' })
    await userEvent.click(screen.getByRole('button', { name: new RegExp('قرض ماشین') }))
    expect(screen.getByRole('dialog', { name: copy.txSheet.editTitle })).toBeInTheDocument()
    expect(screen.getByLabelText(copy.txSheet.amountLabel)).toHaveValue('۱۰٬۰۰۰٬۰۰۰')
  })

  it('renames the person through the menu and refetches', async () => {
    const calls = stubApi({
      'GET /api/people/p1': [{ status: 200, body: detail }, { status: 200, body: { ...detail, name: 'علی احمدی' } }],
      'PATCH /api/people/p1': { status: 200, body: { id: 'p1', name: 'علی احمدی' } },
    })
    renderPerson()
    await screen.findByRole('heading', { name: 'علی رضایی' })
    await userEvent.click(screen.getByRole('button', { name: copy.person.menu }))
    await userEvent.click(screen.getByRole('button', { name: copy.person.rename }))
    const input = screen.getByLabelText(copy.personSheet.nameLabel)
    expect(input).toHaveValue('علی رضایی')
    await userEvent.clear(input)
    await userEvent.type(input, 'علی احمدی')
    await userEvent.click(screen.getByRole('button', { name: copy.personSheet.save }))
    expect(await screen.findByRole('heading', { name: 'علی احمدی' })).toBeInTheDocument()
    expect(calls.find((c) => c.method === 'PATCH')!.body).toEqual({ name: 'علی احمدی' })
  })

  it('deleting the person needs a second tap, names the real transaction count, then goes home', async () => {
    const calls = stubApi({
      'GET /api/people/p1': { status: 200, body: detail },
      'DELETE /api/people/p1': { status: 204 },
    })
    renderPerson()
    await screen.findByRole('heading', { name: 'علی رضایی' })
    await userEvent.click(screen.getByRole('button', { name: copy.person.menu }))
    await userEvent.click(screen.getByRole('button', { name: copy.person.deletePerson }))
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)
    expect(screen.getByText(/۳ تراکنش/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: copy.person.deleteConfirm }))
    expect(await screen.findByText('HOME PAGE')).toBeInTheDocument()
    expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(1)
  })

  it('uses the no-transactions warning when the person has none', async () => {
    stubApi({ 'GET /api/people/p1': { status: 200, body: { ...detail, balance: 0, transactions: [] } } })
    renderPerson()
    await screen.findByRole('heading', { name: 'علی رضایی' })
    await userEvent.click(screen.getByRole('button', { name: copy.person.menu }))
    await userEvent.click(screen.getByRole('button', { name: copy.person.deletePerson }))
    expect(screen.getByText(copy.person.deleteWarnNone)).toBeInTheDocument()
  })

  it('shows a not-found message with a way home for a missing person (404)', async () => {
    stubApi({ 'GET /api/people/p1': { status: 404, body: { error: 'not_found' } } })
    renderPerson()
    expect(await screen.findByText(copy.person.notFound)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: copy.person.backHome })).toHaveAttribute('href', '/')
  })

  it('shows an error with retry for other failures', async () => {
    stubApi({ 'GET /api/people/p1': [{ status: 500, body: { error: 'internal' } }, { status: 200, body: detail }] })
    renderPerson()
    expect(await screen.findByText(copy.errors.internal)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: copy.common.retry }))
    expect(await screen.findByRole('heading', { name: 'علی رضایی' })).toBeInTheDocument()
  })

  it('renders a Latin name in an isolated direction element', async () => {
    stubApi({ 'GET /api/people/p1': { status: 200, body: { ...detail, name: 'John Smith' } } })
    renderPerson()
    const heading = await screen.findByRole('heading', { name: 'John Smith' })
    expect(heading.querySelector('bdi')).not.toBeNull()
  })
})
