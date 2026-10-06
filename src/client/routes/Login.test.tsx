import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from '../auth/AuthContext'
import copy from '../copy'
import Login from './Login'

type Reply = { status: number; body?: unknown }
function stubApi(routes: Record<string, Reply | Reply[]>) {
  const calls: { url: string; body: any }[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, body: init?.body ? JSON.parse(init.body as string) : undefined })
    const r = routes[url]
    const reply = Array.isArray(r) ? r.shift()! : r!
    return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), { status: reply.status })
  }))
  return calls
}
const renderLogin = () =>
  render(<MemoryRouter initialEntries={['/login']}><AuthProvider><Login /></AuthProvider></MemoryRouter>)
afterEach(() => vi.unstubAllGlobals())

describe('Login', () => {
  it('sends the code, then shows the code step with the email', async () => {
    const calls = stubApi({ '/api/me': { status: 401 }, '/api/auth/request-code': { status: 204 } })
    renderLogin()
    await userEvent.type(await screen.findByLabelText(copy.signIn.emailLabel), 'a@b.co')
    await userEvent.click(screen.getByRole('button', { name: copy.signIn.sendCode }))
    expect(await screen.findByText(copy.signIn.codeTitle)).toBeInTheDocument()
    expect(screen.getByText('a@b.co')).toBeInTheDocument()
    expect(calls.find((c) => c.url === '/api/auth/request-code')!.body).toEqual({ email: 'a@b.co' })
  })

  it('shows an inline error for an invalid email from the server and stays on step 1', async () => {
    stubApi({ '/api/me': { status: 401 }, '/api/auth/request-code': { status: 400, body: { error: 'invalid_email' } } })
    renderLogin()
    await userEvent.type(await screen.findByLabelText(copy.signIn.emailLabel), 'x@y.zz')
    await userEvent.click(screen.getByRole('button', { name: copy.signIn.sendCode }))
    expect(await screen.findByText(copy.signIn.errInvalidEmail)).toBeInTheDocument()
  })

  it('shows the rate-limit message on 429', async () => {
    stubApi({ '/api/me': { status: 401 }, '/api/auth/request-code': { status: 429, body: { error: 'rate_limited', retryAfter: 42 } } })
    renderLogin()
    await userEvent.type(await screen.findByLabelText(copy.signIn.emailLabel), 'a@b.co')
    await userEvent.click(screen.getByRole('button', { name: copy.signIn.sendCode }))
    expect(await screen.findByText(copy.signIn.errWaitSeconds)).toBeInTheDocument()
  })

  it('shows the network error when offline', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/api/me') return new Response(null, { status: 401 })
      throw new TypeError('offline')
    }))
    renderLogin()
    await userEvent.type(await screen.findByLabelText(copy.signIn.emailLabel), 'a@b.co')
    await userEvent.click(screen.getByRole('button', { name: copy.signIn.sendCode }))
    expect(await screen.findByText(copy.signIn.errNetwork)).toBeInTheDocument()
  })

  it('auto-submits the code, and a wrong code shows the remaining attempts', async () => {
    const calls = stubApi({
      '/api/me': { status: 401 },
      '/api/auth/request-code': { status: 204 },
      '/api/auth/verify': { status: 400, body: { error: 'wrong_code', attemptsLeft: 3 } },
    })
    renderLogin()
    await userEvent.type(await screen.findByLabelText(copy.signIn.emailLabel), 'a@b.co')
    await userEvent.click(screen.getByRole('button', { name: copy.signIn.sendCode }))
    await screen.findByText(copy.signIn.codeTitle)
    await userEvent.click(screen.getAllByRole('textbox')[0]!)
    await userEvent.keyboard('123456')
    expect(await screen.findByText(new RegExp(copy.signIn.errWrongCode))).toBeInTheDocument()
    expect(screen.getByText(/۳/)).toBeInTheDocument()
    expect(calls.find((c) => c.url === '/api/auth/verify')!.body).toEqual({ email: 'a@b.co', code: '123456' })
  })

  it('code_expired shows its message and offers a new code', async () => {
    stubApi({
      '/api/me': { status: 401 },
      '/api/auth/request-code': { status: 204 },
      '/api/auth/verify': { status: 400, body: { error: 'code_expired' } },
    })
    renderLogin()
    await userEvent.type(await screen.findByLabelText(copy.signIn.emailLabel), 'a@b.co')
    await userEvent.click(screen.getByRole('button', { name: copy.signIn.sendCode }))
    await screen.findByText(copy.signIn.codeTitle)
    await userEvent.click(screen.getAllByRole('textbox')[0]!)
    await userEvent.keyboard('123456')
    expect(await screen.findByText(copy.signIn.errCodeExpired)).toBeInTheDocument()
  })

  it('signs in with the normalized email from the server and leaves the login page', async () => {
    stubApi({
      '/api/me': { status: 401 },
      '/api/auth/request-code': { status: 204 },
      '/api/auth/verify': { status: 200, body: { email: 'a@b.co' } },
    })
    const Who = () => <p>HOME {useAuth().email}</p>
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider><Routes><Route path="/login" element={<Login />} /><Route path="/" element={<Who />} /></Routes></AuthProvider>
      </MemoryRouter>,
    )
    await userEvent.type(await screen.findByLabelText(copy.signIn.emailLabel), 'A@B.co')
    await userEvent.click(screen.getByRole('button', { name: copy.signIn.sendCode }))
    await screen.findByText(copy.signIn.codeTitle)
    await userEvent.click(screen.getAllByRole('textbox')[0]!)
    await userEvent.keyboard('123456')
    expect(await screen.findByText('HOME a@b.co')).toBeInTheDocument()
  })

  it('no attempts left tells the user to get a new code', async () => {
    stubApi({
      '/api/me': { status: 401 },
      '/api/auth/request-code': { status: 204 },
      '/api/auth/verify': { status: 400, body: { error: 'wrong_code', attemptsLeft: 0 } },
    })
    renderLogin()
    await userEvent.type(await screen.findByLabelText(copy.signIn.emailLabel), 'a@b.co')
    await userEvent.click(screen.getByRole('button', { name: copy.signIn.sendCode }))
    await screen.findByText(copy.signIn.codeTitle)
    await userEvent.click(screen.getAllByRole('textbox')[0]!)
    await userEvent.keyboard('123456')
    expect(await screen.findByText(new RegExp(copy.signIn.errCodeExpired))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.signIn.resend })).toBeEnabled()
  })

  it('change-email returns to step 1', async () => {
    stubApi({ '/api/me': { status: 401 }, '/api/auth/request-code': { status: 204 } })
    renderLogin()
    await userEvent.type(await screen.findByLabelText(copy.signIn.emailLabel), 'a@b.co')
    await userEvent.click(screen.getByRole('button', { name: copy.signIn.sendCode }))
    await userEvent.click(await screen.findByRole('button', { name: new RegExp(copy.signIn.changeEmail) }))
    await waitFor(() => expect(screen.getByLabelText(copy.signIn.emailLabel)).toBeInTheDocument())
  })
})
