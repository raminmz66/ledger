import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast } from './Toast'

function Trigger() {
  const { show } = useToast()
  return <button onClick={() => show('ذخیره شد')}>نشان بده</button>
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('Toast', () => {
  it('shows a polite status message and removes it after about 2.2 seconds', () => {
    render(<ToastProvider><Trigger /></ToastProvider>)
    act(() => { screen.getByRole('button', { name: 'نشان بده' }).click() })
    expect(screen.getByRole('status')).toHaveTextContent('ذخیره شد')
    act(() => { vi.advanceTimersByTime(2500) })
    expect(screen.queryByText('ذخیره شد')).toBeNull()
  })
})
