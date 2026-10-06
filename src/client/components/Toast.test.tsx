import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast } from './Toast'

function Trigger({ tone }: { tone?: 'info' | 'error' }) {
  const { show } = useToast()
  return <button onClick={() => show('پیام', tone)}>نشان بده</button>
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('Toast', () => {
  it('has both live regions mounted before any message appears', () => {
    render(<ToastProvider><Trigger /></ToastProvider>)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(screen.getByRole('alert')).toBeEmptyDOMElement()
  })

  it('announces info politely and removes it after about 2.2 seconds', () => {
    render(<ToastProvider><Trigger /></ToastProvider>)
    act(() => { screen.getByRole('button', { name: 'نشان بده' }).click() })
    expect(screen.getByRole('status')).toHaveTextContent('پیام')
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByRole('alert')).toBeEmptyDOMElement()
    act(() => { vi.advanceTimersByTime(2500) })
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('announces errors assertively in the alert region and keeps them longer', () => {
    render(<ToastProvider><Trigger tone="error" /></ToastProvider>)
    act(() => { screen.getByRole('button', { name: 'نشان بده' }).click() })
    expect(screen.getByRole('alert')).toHaveTextContent('پیام')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    act(() => { vi.advanceTimersByTime(2500) })
    expect(screen.getByRole('alert')).toHaveTextContent('پیام')
    act(() => { vi.advanceTimersByTime(2000) })
    expect(screen.getByRole('alert')).toBeEmptyDOMElement()
  })

  it('a newer message replaces the older one and restarts the timer', () => {
    render(<ToastProvider><Trigger /></ToastProvider>)
    const btn = screen.getByRole('button', { name: 'نشان بده' })
    act(() => { btn.click() })
    act(() => { vi.advanceTimersByTime(2000) })
    act(() => { btn.click() })
    act(() => { vi.advanceTimersByTime(2000) })
    expect(screen.getByRole('status')).toHaveTextContent('پیام')
    act(() => { vi.advanceTimersByTime(500) })
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })
})
