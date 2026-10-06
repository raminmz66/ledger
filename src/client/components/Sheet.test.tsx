import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Sheet } from './Sheet'

function Harness({ busy = false, onClose = () => {} }: { busy?: boolean; onClose?: () => void }) {
  return (
    <Sheet open title="عنوان" onClose={onClose} busy={busy}>
      <input aria-label="فیلد" />
      <button>دکمه</button>
    </Sheet>
  )
}

describe('Sheet', () => {
  it('renders nothing when closed', () => {
    render(<Sheet open={false} title="عنوان" onClose={() => {}}><p>x</p></Sheet>)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('is a labelled modal dialog and focuses its first focusable element', () => {
    render(<Harness />)
    const dialog = screen.getByRole('dialog', { name: 'عنوان' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(screen.getByLabelText('فیلد')).toHaveFocus()
  })

  it('closes on Escape and on shade click', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByTestId('sheet-shade'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('does not close while busy', async () => {
    const onClose = vi.fn()
    render(<Harness busy onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByTestId('sheet-shade'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('returns focus to the opener when it closes', async () => {
    function Opener() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>باز کن</button>
          <Sheet open={open} title="عنوان" onClose={() => setOpen(false)}><input aria-label="فیلد" /></Sheet>
        </>
      )
    }
    render(<Opener />)
    const opener = screen.getByRole('button', { name: 'باز کن' })
    await userEvent.click(opener)
    expect(screen.getByLabelText('فیلد')).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(opener).toHaveFocus()
  })
})
