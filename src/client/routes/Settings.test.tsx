import { act, render, screen } from '@testing-library/react'
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

  describe('install section', () => {
    function renderSettings() {
      vi.stubGlobal('fetch', vi.fn(async () => new Response('{"email":"me@b.co"}', { status: 200 })))
      render(
        <MemoryRouter initialEntries={['/settings']}>
          <AuthProvider>
            <Routes>
              <Route element={<ProtectedRoute />}><Route path="/settings" element={<Settings />} /></Route>
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      )
      return screen.findByText('me@b.co')
    }

    it('shows an install button when the browser offers a prompt', async () => {
      await renderSettings()
      expect(screen.queryByText(copy.install.title)).toBeNull()
      const prompt = vi.fn().mockResolvedValue(undefined)
      const evt = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt, userChoice: Promise.resolve({ outcome: 'accepted' }) })
      act(() => { window.dispatchEvent(evt) })
      expect(screen.getByText(copy.install.title)).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: copy.install.button }))
      expect(prompt).toHaveBeenCalledTimes(1)
    })

    it('renders no install section by default', async () => {
      await renderSettings()
      expect(screen.queryByText(copy.install.title)).toBeNull()
      expect(screen.queryByText(copy.install.iosHint)).toBeNull()
    })

    it('shows the manual hint on iPhone', async () => {
      vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 })
      await renderSettings()
      expect(screen.getByText(copy.install.iosHint)).toBeInTheDocument()
    })
  })
})
