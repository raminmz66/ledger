import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

describe('App shell', () => {
  afterEach(() => cleanup())

  it('shows the wordmark on the home route', () => {
    window.history.pushState({}, '', '/')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'دفتر حساب سیمرغ' })).toBeInTheDocument()
  })

  it('falls back to home for unknown client routes', () => {
    window.history.pushState({}, '', '/people/abc')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'دفتر حساب سیمرغ' })).toBeInTheDocument()
  })
})
