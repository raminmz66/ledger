import { formatAmountInput, toFaDigits } from './digits'

export function formatToman(n: number): string {
  const abs = Math.abs(n)
  return abs === 0 ? toFaDigits(0) : formatAmountInput(String(abs))
}

export function balanceView(balance: number): { kind: 'owed' | 'owe' | 'settled'; amount: number } {
  if (balance > 0) return { kind: 'owed', amount: balance }
  if (balance < 0) return { kind: 'owe', amount: -balance }
  return { kind: 'settled', amount: 0 }
}

export function signedToman(direction: 'paid' | 'received', amount: number): string {
  return `${direction === 'paid' ? '+' : '−'}${formatToman(amount)}`
}
