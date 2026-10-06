const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه', 'ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده']
const TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود']
const HUNDREDS = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد']
const SCALES = [
  { value: 1_000_000_000_000, name: 'تریلیون' },
  { value: 1_000_000_000, name: 'میلیارد' },
  { value: 1_000_000, name: 'میلیون' },
  { value: 1000, name: 'هزار' },
]

function below1000(n: number): string {
  const parts: string[] = []
  if (n >= 100) parts.push(HUNDREDS[Math.floor(n / 100)]!)
  const rest = n % 100
  if (rest >= 20) {
    parts.push(TENS[Math.floor(rest / 10)]!)
    if (rest % 10) parts.push(ONES[rest % 10]!)
  } else if (rest > 0) {
    parts.push(ONES[rest]!)
  }
  return parts.join(' و ')
}

export function numberToWordsFa(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 1_000_000_000_000) throw new RangeError('numberToWordsFa: out of range')
  if (n === 0) return 'صفر'
  const parts: string[] = []
  let rest = n
  for (const { value, name } of SCALES) {
    const count = Math.floor(rest / value)
    if (count > 0) {
      parts.push(value === 1000 && count === 1 ? name : `${below1000(count)} ${name}`)
      rest -= count * value
    }
  }
  if (rest > 0) parts.push(below1000(rest))
  return parts.join(' و ')
}
