import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import copy from '../copy'
import { toFaDigits, toLatinDigits } from '../format/digits'

type Props = { length?: number; disabled?: boolean; onComplete(code: string): void; onChange?(code: string): void; resetKey?: number }

export default function OtpInput({ length = 6, disabled, onComplete, onChange: onCodeChange, resetKey }: Props) {
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(''))
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const commit = (next: string[], focusAt: number) => {
    setDigits(next)
    onCodeChange?.(next.join(''))
    refs.current[Math.min(focusAt, length - 1)]?.focus()
    // Event handlers run once per user action, so this fires once per fill.
    if (next.every(Boolean)) onComplete(next.join(''))
  }

  useEffect(() => {
    setDigits(Array(length).fill(''))
    onCodeChange?.('')
    refs.current[0]?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, length])

  const fill = (text: string) => {
    const pasted = toLatinDigits(text).replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    commit(Array.from({ length }, (_, i) => pasted[i] ?? ''), pasted.length)
  }

  const onChange = (i: number, raw: string) => {
    // Autofill can deliver the whole code into one box: treat it like a paste.
    // (No maxLength on the boxes: browsers would truncate that to one digit.)
    if (toLatinDigits(raw).replace(/\D/g, '').length >= length) return fill(raw)
    // Typing into a filled box replaces its digit with the new one.
    const d = toLatinDigits(raw.length > 1 ? (raw[0] === digits[i] ? raw.slice(-1) : raw[0]!) : raw)
    if (d === '') return commit(digits.map((x, j) => (j === i ? '' : x)), i)
    if (!/^\d$/.test(d)) return
    const next = [...digits]
    next[i] = d
    commit(next, i + 1)
  }

  const onPaste = (e: ClipboardEvent) => {
    e.preventDefault()
    fill(e.clipboardData.getData('text'))
  }

  const onKeyDown = (i: number, e: KeyboardEvent) => {
    if (e.key !== 'Backspace' || digits[i] || i === 0) return
    // Empty box: delete the previous digit and step back.
    e.preventDefault()
    commit(digits.map((x, j) => (j === i - 1 ? '' : x)), i - 1)
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
          aria-label={`${copy.signIn.digitLabel} ${toFaDigits(i + 1)}`}
          onChange={(e) => onChange(i, e.target.value)}
          onPaste={onPaste}
          onKeyDown={(e) => onKeyDown(i, e)}
        />
      ))}
    </div>
  )
}
