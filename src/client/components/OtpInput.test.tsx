import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import OtpInput from './OtpInput'

const boxes = () => screen.getAllByRole('textbox') as HTMLInputElement[]

describe('OtpInput', () => {
  it('renders six numeric boxes with one-time-code autofill on the first', () => {
    render(<OtpInput onComplete={() => {}} />)
    expect(boxes()).toHaveLength(6)
    expect(boxes()[0]!.getAttribute('autocomplete')).toBe('one-time-code')
    for (const b of boxes()) expect(b.getAttribute('inputmode')).toBe('numeric')
  })

  it('moves focus while typing and completes once, with Latin digits', async () => {
    const onComplete = vi.fn()
    render(<OtpInput onComplete={onComplete} />)
    await userEvent.click(boxes()[0]!)
    await userEvent.keyboard('۴۸۱۲۰۹')
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith('481209')
  })

  it('fills all boxes from a paste', async () => {
    const onComplete = vi.fn()
    render(<OtpInput onComplete={onComplete} />)
    await userEvent.click(boxes()[0]!)
    await userEvent.paste('481209')
    expect(onComplete).toHaveBeenCalledWith('481209')
  })

  it('ignores non-digits', async () => {
    const onComplete = vi.fn()
    render(<OtpInput onComplete={onComplete} />)
    await userEvent.click(boxes()[0]!)
    await userEvent.keyboard('ab12')
    expect(boxes().map((b) => b.value).join('')).toBe('12')
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('backspace on an empty box moves back and clears the previous digit', async () => {
    render(<OtpInput onComplete={() => {}} />)
    await userEvent.click(boxes()[0]!)
    await userEvent.keyboard('12')
    await userEvent.keyboard('{Backspace}')
    expect(boxes().map((b) => b.value).join('')).toBe('1')
    await userEvent.keyboard('{Backspace}')
    expect(boxes().map((b) => b.value).join('')).toBe('')
  })

  it('fills all boxes from a 6-digit value of any length-checked input event', async () => {
    const onComplete = vi.fn()
    render(<OtpInput onComplete={onComplete} />)
    expect(boxes()[0]!.hasAttribute('maxlength')).toBe(false)
    fireEvent.change(boxes()[0]!, { target: { value: '۴۸۱۲۰۹' } })
    expect(onComplete).toHaveBeenCalledWith('481209')
  })

  it('typing a different digit into a filled box replaces it', async () => {
    render(<OtpInput onComplete={() => {}} />)
    await userEvent.click(boxes()[0]!)
    await userEvent.keyboard('1')
    await userEvent.click(boxes()[0]!)
    await userEvent.keyboard('7')
    expect(boxes()[0]!.value).toBe('7')
  })

  it('treats a multi-character value in one box (autofill) like a paste', async () => {
    const onComplete = vi.fn()
    render(<OtpInput onComplete={onComplete} />)
    fireEvent.change(boxes()[0]!, { target: { value: '481209' } })
    expect(boxes().map((b) => b.value).join('')).toBe('481209')
    expect(onComplete).toHaveBeenCalledWith('481209')
  })

  it('clears when resetKey changes', async () => {
    const { rerender } = render(<OtpInput onComplete={() => {}} resetKey={0} />)
    await userEvent.click(boxes()[0]!)
    await userEvent.keyboard('123')
    rerender(<OtpInput onComplete={() => {}} resetKey={1} />)
    expect(boxes().map((b) => b.value).join('')).toBe('')
  })
})
