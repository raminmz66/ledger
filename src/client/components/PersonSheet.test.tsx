import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import copy from '../copy'
import { stubApi } from '../test/stub-api'
import { ToastProvider } from './Toast'
import { PersonSheet } from './PersonSheet'

afterEach(() => vi.unstubAllGlobals())

const wrap = (ui: React.ReactElement) => render(<ToastProvider>{ui}</ToastProvider>)

describe('PersonSheet add', () => {
  it('posts the cleaned name and reports the created person', async () => {
    const calls = stubApi({ 'POST /api/people': { status: 201, body: { id: 'p1', name: 'علی' } } })
    const onDone = vi.fn()
    wrap(<PersonSheet open mode="add" onClose={() => {}} onDone={onDone} />)
    await userEvent.type(screen.getByLabelText(copy.personSheet.nameLabel), '  علي ')
    await userEvent.click(screen.getByRole('button', { name: copy.personSheet.add }))
    await waitFor(() => expect(onDone).toHaveBeenCalledWith({ id: 'p1', name: 'علی' }))
    expect(calls.find((c) => c.method === 'POST')!.body).toEqual({ name: 'علی' })
  })

  it('blocks an empty name client-side with a Persian message and sends nothing', async () => {
    const calls = stubApi({})
    wrap(<PersonSheet open mode="add" onClose={() => {}} onDone={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: copy.personSheet.add }))
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(copy.errors.invalid_name)
    expect(calls).toHaveLength(0)
  })

  it('shows the server error, keeps the typed name, and re-enables the button', async () => {
    stubApi({ 'POST /api/people': { status: 500, body: { error: 'internal' } } })
    wrap(<PersonSheet open mode="add" onClose={() => {}} onDone={() => {}} />)
    await userEvent.type(screen.getByLabelText(copy.personSheet.nameLabel), 'علی')
    const btn = screen.getByRole('button', { name: copy.personSheet.add })
    await userEvent.click(btn)
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(copy.errors.internal)
    expect(screen.getByLabelText(copy.personSheet.nameLabel)).toHaveValue('علی')
    expect(btn).toBeEnabled()
  })

  it('disables the button while the request is in flight (no double submit)', async () => {
    let release!: () => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((res) => { release = () => res(new Response('{"id":"p1","name":"علی"}', { status: 201 })) })))
    wrap(<PersonSheet open mode="add" onClose={() => {}} onDone={() => {}} />)
    await userEvent.type(screen.getByLabelText(copy.personSheet.nameLabel), 'علی')
    const btn = screen.getByRole('button', { name: copy.personSheet.add })
    await userEvent.click(btn)
    expect(btn).toBeDisabled()
    await userEvent.click(btn)
    expect((fetch as any).mock.calls).toHaveLength(1)
    release()
  })
})

describe('PersonSheet rename', () => {
  it('prefills the name and PATCHes the new one', async () => {
    const calls = stubApi({ 'PATCH /api/people/p1': { status: 200, body: { id: 'p1', name: 'علی رضایی' } } })
    const onDone = vi.fn()
    wrap(<PersonSheet open mode="rename" personId="p1" initialName="علی" onClose={() => {}} onDone={onDone} />)
    const input = screen.getByLabelText(copy.personSheet.nameLabel)
    expect(input).toHaveValue('علی')
    await userEvent.clear(input)
    await userEvent.type(input, 'علی رضایی')
    await userEvent.click(screen.getByRole('button', { name: copy.personSheet.save }))
    await waitFor(() => expect(onDone).toHaveBeenCalledWith({ id: 'p1', name: 'علی رضایی' }))
    expect(calls.find((c) => c.method === 'PATCH')!.body).toEqual({ name: 'علی رضایی' })
  })
})
