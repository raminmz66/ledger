import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { toFaDigits, toLatinDigits } from '../format/digits'

type Props = { length?: number; disabled?: boolean; onComplete(code: string): void; resetKey?: number }

export default function OtpInput({ length = 6, disabled, onComplete, resetKey }: Props) {
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(''))
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const commit = (next: string[], focusAt: number) => {
    setDigits(next)
    refs.current[Math.min(focusAt, length - 1)]?.focus()
    // Event handlers run once per user action, so this fires once per fill.
    if (next.every(Boolean)) onComplete(next.join(''))
  }

  useEffect(() => {
    setDigits(Array(length).fill(''))
    refs.current[0]?.focus()
  }, [resetKey, length])

  const onChange = (i: number, raw: string) => {
    const d = toLatinDigits(raw.slice(-1))
    if (d === '') return setDigits(digits.map((x, j) => (j === i ? '' : x)))
    if (!/^\d$/.test(d)) return
    const next = [...digits]
    next[i] = d
    commit(next, i + 1)
  }

  const onPaste = (e: ClipboardEvent) => {
    e.preventDefault()
    const pasted = toLatinDigits(e.clipboardData.getData('text')).replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    commit(Array.from({ length }, (_, i) => pasted[i] ?? ''), pasted.length)
    if (pasted.length < length) refs.current[pasted.length]?.focus()
  }

  const onKeyDown = (i: number, e: KeyboardEvent) => {
    if (e.key !== 'Backspace' || digits[i] || i === 0) return
    // Empty box: step back; the next Backspace clears that box's digit.
    e.preventDefault()
    refs.current[i - 1]?.focus()
  }

  return (
    <div className="otp" dir="ltr">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={`رقم ${toFaDigits(i + 1)}`}
          onChange={(e) => onChange(i, e.target.value)}
          onPaste={onPaste}
          onKeyDown={(e) => onKeyDown(i, e)}
        />
      ))}
    </div>
  )
}
