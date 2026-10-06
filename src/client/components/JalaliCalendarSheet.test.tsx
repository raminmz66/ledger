import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import copy from '../copy'
import { JalaliCalendarSheet } from './JalaliCalendarSheet'

const dayButton = (n: string) =>
  within(screen.getByRole('dialog')).getAllByRole('button').find((b) => b.textContent === n && !b.className.includes('muted'))!

describe('JalaliCalendarSheet', () => {
  it('opens on the month of the value with a Persian month label and Saturday-first weekdays', () => {
    render(<JalaliCalendarSheet open value="2026-10-06" onPick={() => {}} onClose={() => {}} />)
    // 2026-10-06 is 14 Mehr 1405
    expect(screen.getByText(/مهر/)).toBeInTheDocument()
    expect(screen.getByText(/۱۴۰۵/)).toBeInTheDocument()
    const weekdays = screen.getAllByText(/^[شیدسچپج]$/).map((e) => e.textContent)
    expect(weekdays).toEqual(['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'])
  })

  it('picking a day returns the exact Gregorian date and closes', async () => {
    const onPick = vi.fn()
    const onClose = vi.fn()
    render(<JalaliCalendarSheet open value="2026-10-06" onPick={onPick} onClose={onClose} />)
    await userEvent.click(dayButton('۱۰')) // 10 Mehr 1405 = 2026-10-02
    expect(onPick).toHaveBeenCalledWith('2026-10-02')
    expect(onClose).toHaveBeenCalled()
  })

  it('navigates months in both directions, including into Esfand and across the year', async () => {
    const onPick = vi.fn()
    // 2026-03-20 is 29 Esfand 1404 (1404 is not a leap year, so Esfand has 29 days)
    render(<JalaliCalendarSheet open value="2026-03-20" onPick={onPick} onClose={() => {}} />)
    expect(screen.getByText(/اسفند/)).toBeInTheDocument()
    expect(dayButton('۲۹')).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: copy.calendar.nextMonth }))
    expect(screen.getByText(/فروردین/)).toBeInTheDocument()
    expect(screen.getByText(/۱۴۰۵/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: copy.calendar.prevMonth }))
    await userEvent.click(screen.getByRole('button', { name: copy.calendar.prevMonth }))
    expect(screen.getByText(/بهمن/)).toBeInTheDocument()
  })

  it('selects the leap day 30 Esfand 1403', async () => {
    const onPick = vi.fn()
    render(<JalaliCalendarSheet open value="2025-03-20" onPick={onPick} onClose={() => {}} />) // 30 Esfand 1403
    await userEvent.click(dayButton('۳۰'))
    expect(onPick).toHaveBeenCalledWith('2025-03-20')
  })

  it('the today shortcut picks today', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-06T10:00:00'))
    const onPick = vi.fn()
    render(<JalaliCalendarSheet open value="2026-01-01" onPick={onPick} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: copy.calendar.today }))
    expect(onPick).toHaveBeenCalledWith('2026-10-06')
    vi.useRealTimers()
  })

  it('marks the selected day', () => {
    render(<JalaliCalendarSheet open value="2026-10-06" onPick={() => {}} onClose={() => {}} />)
    expect(dayButton('۱۴')).toHaveAttribute('aria-pressed', 'true')
  })
})
