import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthContext'
import ProtectedRoute from '../auth/ProtectedRoute'
import copy from '../copy'
import Settings from './Settings'

afterEach(() => vi.unstubAllGlobals())

describe('Settings', () => {
  it('shows the email and logs out to the login screen', async () => {
    const calls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push(url)
      if (url === '/api/me') return new Response('{"email":"me@b.co"}', { status: 200 })
      return new Response(null, { status: 204 })
    }))
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<p>LOGIN PAGE</p>} />
            <Route element={<ProtectedRoute />}><Route path="/settings" element={<Settings />} /></Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByText('me@b.co')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: copy.settings.logout }))
    expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument()
    expect(calls).toContain('/api/auth/logout')
  })

  it('stays signed in and shows an error when logout fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/api/me') return new Response('{"email":"me@b.co"}', { status: 200 })
      throw new TypeError('offline')
    }))
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<p>LOGIN PAGE</p>} />
            <Route element={<ProtectedRoute />}><Route path="/settings" element={<Settings />} /></Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )
    await screen.findByText('me@b.co')
    await userEvent.click(screen.getByRole('button', { name: copy.settings.logout }))
    expect(await screen.findByText(copy.settings.errLogout)).toBeInTheDocument()
    expect(screen.queryByText('LOGIN PAGE')).not.toBeInTheDocument()
  })

  it('redirects anonymous visitors to /login', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 401 })))
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<p>LOGIN PAGE</p>} />
            <Route element={<ProtectedRoute />}><Route path="/settings" element={<Settings />} /></Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument()
  })
})
