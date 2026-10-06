import { describe, expect, it } from 'vitest'
import { groupByDate } from './group'

describe('groupByDate', () => {
  it('groups consecutive equal dates and keeps order', () => {
    const items = [
      { id: 1, date: '2026-10-07' },
      { id: 2, date: '2026-10-07' },
      { id: 3, date: '2026-10-06' },
      { id: 4, date: '2026-10-07' },
    ]
    expect(groupByDate(items)).toEqual([
      { date: '2026-10-07', items: [items[0], items[1]] },
      { date: '2026-10-06', items: [items[2]] },
      { date: '2026-10-07', items: [items[3]] },
    ])
  })
  it('returns [] for empty input', () => {
    expect(groupByDate([])).toEqual([])
  })
})
