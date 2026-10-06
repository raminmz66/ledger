import { useRef, useState } from 'react'
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

function rootContainer() {
  const root = document.createElement('div')
  root.id = 'root'
  document.body.appendChild(root)
  return root
}

describe('Sheet a11y', () => {
  it('renders outside #root and marks #root inert only while open', async () => {
    const root = rootContainer()
    function App() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>باز کن</button>
          <Sheet open={open} title="عنوان" onClose={() => setOpen(false)}><input aria-label="فیلد" /></Sheet>
        </>
      )
    }
    render(<App />, { container: root })
    expect(root).not.toHaveAttribute('inert')
    await userEvent.click(screen.getByRole('button', { name: 'باز کن' }))
    expect(root).toHaveAttribute('inert')
    expect(root.contains(screen.getByRole('dialog'))).toBe(false)
    await userEvent.keyboard('{Escape}')
    expect(root).not.toHaveAttribute('inert')
    root.remove()
  })

  it('keeps #root inert while a second sheet is stacked and until the last one closes', async () => {
    const root = rootContainer()
    function App() {
      const [a, setA] = useState(true)
      const [b, setB] = useState(true)
      return (
        <>
          <Sheet open={a} title="الف" onClose={() => setA(false)}><button>x</button></Sheet>
          <Sheet open={b} title="ب" onClose={() => setB(false)}><button>y</button></Sheet>
        </>
      )
    }
    render(<App />, { container: root })
    expect(root).toHaveAttribute('inert')
    await userEvent.keyboard('{Escape}') // closes the topmost (ب)
    expect(root).toHaveAttribute('inert')
    await userEvent.keyboard('{Escape}')
    expect(root).not.toHaveAttribute('inert')
    root.remove()
  })

  it('traps Tab and Shift+Tab inside the dialog', async () => {
    render(
      <Sheet open title="عنوان" onClose={() => {}}>
        <input aria-label="اول" />
        <button>دوم</button>
      </Sheet>,
    )
    const first = screen.getByLabelText('اول')
    const close = screen.getByRole('button', { name: 'بستن' })
    expect(first).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'دوم' })).toHaveFocus()
    await userEvent.tab()
    expect(close).toHaveFocus()
    await userEvent.tab()
    expect(first).toHaveFocus() // wrapped, did not leave the dialog
    await userEvent.tab({ shift: true })
    expect(close).toHaveFocus() // wrapped backwards
  })

  it('returns focus to returnFocusRef when the opener has unmounted', async () => {
    function App() {
      const [open, setOpen] = useState(false)
      const [showOpener, setShowOpener] = useState(true)
      const anchor = useRef<HTMLButtonElement>(null)
      return (
        <>
          <button ref={anchor}>لنگر</button>
          {showOpener && (
            <button onClick={() => { setOpen(true); setShowOpener(false) }}>باز کن</button>
          )}
          <Sheet open={open} title="عنوان" onClose={() => setOpen(false)} returnFocusRef={anchor}>
            <input aria-label="فیلد" />
          </Sheet>
        </>
      )
    }
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'باز کن' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'لنگر' })).toHaveFocus()
  })

  it('applies scroll containment and a vh fallback before dvh in the stylesheet', async () => {
    const css = (await import('node:fs')).readFileSync('src/client/styles/global.css', 'utf8')
    const block = /\.sheet\s*\{[^}]*\}/.exec(css)![0]
    expect(block).toMatch(/overscroll-behavior:\s*contain/)
    expect(block.indexOf('92vh')).toBeGreaterThan(-1)
    expect(block.indexOf('92vh')).toBeLessThan(block.indexOf('92dvh'))
  })
})
