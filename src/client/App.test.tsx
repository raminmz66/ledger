import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import copy from './copy'

afterEach(() => vi.unstubAllGlobals())

const stubMe = (status: number, body?: string) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body ?? null, { status })))

describe('App shell', () => {
  it('sends anonymous visitors from / to the sign-in screen', async () => {
    stubMe(401)
    window.history.pushState({}, '', '/')
    render(<App />)
    expect(await screen.findByRole('heading', { name: copy.signIn.title })).toBeInTheDocument()
  })

  it('falls back to home for unknown client routes, then to sign-in when anonymous', async () => {
    stubMe(401)
    window.history.pushState({}, '', '/people/abc')
    render(<App />)
    expect(await screen.findByRole('heading', { name: copy.signIn.title })).toBeInTheDocument()
  })

  it('shows the wordmark on / when signed in', async () => {
    stubMe(200, '{"email":"me@b.co"}')
    window.history.pushState({}, '', '/')
    render(<App />)
    expect(await screen.findByRole('heading', { name: copy.appName })).toBeInTheDocument()
  })
})
