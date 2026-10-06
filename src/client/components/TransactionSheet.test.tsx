import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import copy from '../copy'
import { stubApi } from '../test/stub-api'
import { ToastProvider } from './Toast'
import { TransactionSheet } from './TransactionSheet'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-06T10:00:00'))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const wrap = (ui: React.ReactElement) => render(<ToastProvider>{ui}</ToastProvider>)
const addProps = { open: true, personId: 'p1', personName: 'علی', mode: 'add' as const, onClose: () => {}, onSaved: () => {} }

describe('TransactionSheet add', () => {
  it('shows the person in the title, preselects the direction and today, and writes the amount in words', async () => {
    wrap(<TransactionSheet {...addProps} direction="received" />)
    expect(screen.getByRole('dialog', { name: new RegExp('علی') })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: copy.person.receivedButton })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('button', { name: copy.txSheet.today })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.type(screen.getByLabelText(copy.txSheet.amountLabel), '۲۵۰۰۰۰۰')
    expect(screen.getByLabelText(copy.txSheet.amountLabel)).toHaveValue('۲٬۵۰۰٬۰۰۰')
    expect(screen.getByText('دو میلیون و پانصد هزار تومان')).toBeInTheDocument()
  })

  it('posts Latin integers, the Gregorian date of the chosen chip, and a null note', async () => {
    const calls = stubApi({ 'POST /api/people/p1/transactions': { status: 201, body: { id: 't1' } } })
    const onSaved = vi.fn()
    wrap(<TransactionSheet {...addProps} direction="paid" onSaved={onSaved} />)
    await userEvent.type(screen.getByLabelText(copy.txSheet.amountLabel), '۲٬۵۰۰٬۰۰۰')
    await userEvent.click(screen.getByRole('button', { name: copy.txSheet.yesterday }))
    await userEvent.click(screen.getByRole('button', { name: copy.txSheet.save }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(calls.find((c) => c.method === 'POST')!.body).toEqual({ direction: 'paid', amount: 2_500_000, date: '2026-10-05', note: null })
  })

  it('sends the trimmed note and a switched direction', async () => {
    const calls = stubApi({ 'POST /api/people/p1/transactions': { status: 201, body: { id: 't1' } } })
    wrap(<TransactionSheet {...addProps} direction="paid" />)
    await userEvent.click(screen.getByRole('radio', { name: copy.person.receivedButton }))
    await userEvent.type(screen.getByLabelText(copy.txSheet.amountLabel), '1000')
    await userEvent.type(screen.getByLabelText(copy.txSheet.noteLabel), '  سهم شام ')
    await userEvent.click(screen.getByRole('button', { name: copy.txSheet.save }))
    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true))
    expect(calls.find((c) => c.method === 'POST')!.body).toEqual({ direction: 'received', amount: 1000, date: '2026-10-06', note: 'سهم شام' })
  })

  it('picks a date from the Jalali calendar and sends its Gregorian equivalent', async () => {
    const calls = stubApi({ 'POST /api/people/p1/transactions': { status: 201, body: { id: 't1' } } })
    wrap(<TransactionSheet {...addProps} direction="paid" />)
    await userEvent.type(screen.getByLabelText(copy.txSheet.amountLabel), '500')
    await userEvent.click(screen.getByRole('button', { name: copy.txSheet.pickDate }))
    const day = screen.getAllByRole('button').find((b) => b.textContent === '۱۰' && !b.className.includes('muted'))!
    await userEvent.click(day) // 10 Mehr 1405 = 2026-10-02
    expect(screen.getByText(/۱۰ مهر ۱۴۰۵/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: copy.txSheet.save }))
    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true))
    expect(calls.find((c) => c.method === 'POST')!.body.date).toBe('2026-10-02')
  })

  it.each(['', '0', '۰'])('blocks amount "%s" with a Persian message and sends nothing', async (typed) => {
    const calls = stubApi({})
    wrap(<TransactionSheet {...addProps} direction="paid" />)
    if (typed) await userEvent.type(screen.getByLabelText(copy.txSheet.amountLabel), typed)
    await userEvent.click(screen.getByRole('button', { name: copy.txSheet.save }))
    expect(await screen.findByRole('alert')).toHaveTextContent(copy.errors.invalid_amount)
    expect(calls).toHaveLength(0)
  })

  it('blocks an over-limit amount', async () => {
    const calls = stubApi({})
    wrap(<TransactionSheet {...addProps} direction="paid" />)
    await userEvent.type(screen.getByLabelText(copy.txSheet.amountLabel), '1000000000001')
    await userEvent.click(screen.getByRole('button', { name: copy.txSheet.save }))
    expect(await screen.findByRole('alert')).toHaveTextContent(copy.errors.invalid_amount)
    expect(calls).toHaveLength(0)
  })

  it('keeps the form and shows the server error on failure; button re-enabled', async () => {
    stubApi({ 'POST /api/people/p1/transactions': { status: 404, body: { error: 'not_found' } } })
    wrap(<TransactionSheet {...addProps} direction="paid" />)
    await userEvent.type(screen.getByLabelText(copy.txSheet.amountLabel), '500')
    const save = screen.getByRole('button', { name: copy.txSheet.save })
    await userEvent.click(save)
    expect(await screen.findByRole('alert')).toHaveTextContent(copy.errors.not_found)
    expect(screen.getByLabelText(copy.txSheet.amountLabel)).toHaveValue('۵۰۰')
    expect(save).toBeEnabled()
  })

  it('disables Save while the request is in flight (no double submit)', async () => {
    let release!: () => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((res) => { release = () => res(new Response('{"id":"t"}', { status: 201 })) })))
    wrap(<TransactionSheet {...addProps} direction="paid" />)
    await userEvent.type(screen.getByLabelText(copy.txSheet.amountLabel), '500')
    const save = screen.getByRole('button', { name: copy.txSheet.save })
    await userEvent.click(save)
    expect(save).toBeDisabled()
    await userEvent.click(save)
    expect((fetch as any).mock.calls).toHaveLength(1)
    release()
  })
})

describe('TransactionSheet edit', () => {
  const tx = { id: 't9', direction: 'paid' as const, amount: 10_000_000, date: '2026-10-06', note: 'قرض ماشین' }
  const editProps = { open: true, personId: 'p1', personName: 'علی', mode: 'edit' as const, tx, onClose: () => {}, onSaved: () => {} }

  it('prefills every field, including the date as Jalali', () => {
    wrap(<TransactionSheet {...editProps} />)
    expect(screen.getByLabelText(copy.txSheet.amountLabel)).toHaveValue('۱۰٬۰۰۰٬۰۰۰')
    expect(screen.getByLabelText(copy.txSheet.noteLabel)).toHaveValue('قرض ماشین')
    expect(screen.getByRole('radio', { name: copy.person.paidButton })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(/۱۴ مهر ۱۴۰۵/)).toBeInTheDocument()
  })

  it('PATCHes all fields; clearing the note sends null', async () => {
    const calls = stubApi({ 'PATCH /api/transactions/t9': { status: 200, body: { id: 't9' } } })
    wrap(<TransactionSheet {...editProps} />)
    await userEvent.clear(screen.getByLabelText(copy.txSheet.noteLabel))
    await userEvent.clear(screen.getByLabelText(copy.txSheet.amountLabel))
    await userEvent.type(screen.getByLabelText(copy.txSheet.amountLabel), '9000000')
    await userEvent.click(screen.getByRole('button', { name: copy.txSheet.saveChanges }))
    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true))
    expect(calls.find((c) => c.method === 'PATCH')!.body).toEqual({ direction: 'paid', amount: 9_000_000, date: '2026-10-06', note: null })
  })

  it('delete needs a second tap: the first sends nothing, the second DELETEs', async () => {
    const calls = stubApi({ 'DELETE /api/transactions/t9': { status: 204 } })
    const onSaved = vi.fn()
    wrap(<TransactionSheet {...editProps} onSaved={onSaved} />)
    await userEvent.click(screen.getByRole('button', { name: copy.txSheet.deleteTx }))
    expect(calls).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: copy.txSheet.deleteConfirm }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(calls).toEqual([{ method: 'DELETE', url: '/api/transactions/t9', body: undefined }])
  })

  it('has no delete button in add mode', () => {
    wrap(<TransactionSheet {...addProps} direction="paid" />)
    expect(screen.queryByRole('button', { name: copy.txSheet.deleteTx })).toBeNull()
  })
})

describe('stacked sheets', () => {
  it('Escape closes only the topmost sheet (calendar), then the transaction sheet', async () => {
    const onClose = vi.fn()
    wrap(<TransactionSheet {...addProps} direction="paid" onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: copy.txSheet.pickDate }))
    expect(screen.getAllByRole('dialog')).toHaveLength(2)
    await userEvent.keyboard('{Escape}')
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(onClose).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking the calendar shade closes only the calendar', async () => {
    const onClose = vi.fn()
    wrap(<TransactionSheet {...addProps} direction="paid" onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: copy.txSheet.pickDate }))
    await userEvent.click(screen.getAllByTestId('sheet-shade')[1]!)
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(onClose).not.toHaveBeenCalled()
  })
})
