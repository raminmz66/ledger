import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthContext'
import ProtectedRoute from './ProtectedRoute'

afterEach(() => vi.unstubAllGlobals())

function LoginProbe() {
  const loc = useLocation()
  return <p>LOGIN from={(loc.state as { from?: string } | null)?.from}</p>
}

describe('ProtectedRoute', () => {
  it('sends anonymous visitors to /login remembering where they were going', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 401 })))
    render(
      <MemoryRouter initialEntries={['/people/abc?tab=1']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginProbe />} />
            <Route element={<ProtectedRoute />}><Route path="/people/:id" element={<p>PERSON</p>} /></Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByText('LOGIN from=/people/abc?tab=1')).toBeInTheDocument()
  })
})
