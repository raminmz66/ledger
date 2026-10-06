import { describe, expect, it } from 'vitest'
import { balanceView, formatToman, signedToman } from './money'

describe('formatToman', () => {
  it('uses Persian digits and the Persian thousands separator on the absolute value', () => {
    expect(formatToman(8_000_000)).toBe('۸٬۰۰۰٬۰۰۰')
    expect(formatToman(-3_200_000)).toBe('۳٬۲۰۰٬۰۰۰')
    expect(formatToman(0)).toBe('۰')
    expect(formatToman(999)).toBe('۹۹۹')
  })
})

describe('balanceView', () => {
  it('classifies the sign and returns the absolute amount', () => {
    expect(balanceView(5)).toEqual({ kind: 'owed', amount: 5 })
    expect(balanceView(-7)).toEqual({ kind: 'owe', amount: 7 })
    expect(balanceView(0)).toEqual({ kind: 'settled', amount: 0 })
  })
})

describe('signedToman', () => {
  it('paid is +, received is a true minus sign U+2212', () => {
    expect(signedToman('paid', 10_000_000)).toBe('+۱۰٬۰۰۰٬۰۰۰')
    expect(signedToman('received', 2_000_000)).toBe('−۲٬۰۰۰٬۰۰۰')
  })
})
