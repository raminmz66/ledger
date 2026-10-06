import { useEffect, useState } from 'react'
import copy from '../copy'
import {
  buildJalaliMonthGrid,
  formatGregorianToJalali,
  jalaliMonthLabel,
  parseJalaliParts,
  parseJalaliToGregorian,
  shiftJalaliMonth,
  todayGregorian,
  todayJalali,
} from '../dates/jalali'
import { toFaDigits } from '../format/digits'
import { Sheet } from './Sheet'

const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

export type JalaliCalendarSheetProps = {
  open: boolean
  /** Gregorian YYYY-MM-DD */
  value: string
  onPick: (gregorian: string) => void
  onClose: () => void
}

function monthAnchor(gregorian: string): string {
  const p = parseJalaliParts(formatGregorianToJalali(gregorian)) ?? parseJalaliParts(todayJalali())!
  return `${p.year}/${String(p.month).padStart(2, '0')}/01`
}

export function JalaliCalendarSheet({ open, value, onPick, onClose }: JalaliCalendarSheetProps) {
  const [viewMonth, setViewMonth] = useState(() => monthAnchor(value))
  useEffect(() => {
    if (open) setViewMonth(monthAnchor(value))
  }, [open, value])

  const selected = formatGregorianToJalali(value)
  const todayJ = todayJalali()

  function pick(gregorian: string | null) {
    if (!gregorian) return
    onPick(gregorian)
    onClose()
  }

  return (
    <Sheet open={open} title={copy.calendar.title} onClose={onClose}>
      <div className="jalali-date-nav">
        {/* PAT order kept: first DOM button = next month. */}
        <button type="button" aria-label={copy.calendar.nextMonth} onClick={() => setViewMonth(shiftJalaliMonth(viewMonth, 1))}>‹</button>
        <span>{jalaliMonthLabel(viewMonth)}</span>
        <button type="button" aria-label={copy.calendar.prevMonth} onClick={() => setViewMonth(shiftJalaliMonth(viewMonth, -1))}>›</button>
      </div>
      <div className="jalali-date-weekdays">
        {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="jalali-date-grid">
        {buildJalaliMonthGrid(viewMonth).map((cell) => {
          const isSel = cell.jalali === selected
          return (
            <button
              key={cell.jalali}
              type="button"
              aria-pressed={isSel}
              className={[
                'jalali-date-day',
                cell.inMonth ? '' : 'jalali-date-day--muted',
                isSel ? 'jalali-date-day--selected' : '',
                cell.jalali === todayJ ? 'jalali-date-day--today' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => pick(parseJalaliToGregorian(cell.jalali))}
            >
              {toFaDigits(cell.day)}
            </button>
          )
        })}
      </div>
      <button type="button" className="btn btn--ghost" onClick={() => pick(todayGregorian())}>{copy.calendar.today}</button>
    </Sheet>
  )
}
