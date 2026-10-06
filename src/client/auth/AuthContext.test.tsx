import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AUTH_EXPIRED } from '../api'
import { AuthProvider } from './AuthContext'
import ProtectedRoute from './ProtectedRoute'

afterEach(() => vi.unstubAllGlobals())

describe('AuthProvider', () => {
  it('goes anonymous and redirects to /login when a session expires mid-use', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"email":"me@b.co"}', { status: 200 })))
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<p>LOGIN PAGE</p>} />
            <Route element={<ProtectedRoute />}><Route path="/" element={<p>HOME PAGE</p>} /></Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByText('HOME PAGE')).toBeInTheDocument()
    act(() => { window.dispatchEvent(new Event(AUTH_EXPIRED)) })
    expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument()
  })
})
