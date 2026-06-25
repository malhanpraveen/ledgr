import { describe, it, expect } from 'vitest'
import { buildCsvString } from '../utils/exportCsv'
import type { Expense } from '../types'

const SAMPLE: Expense[] = [
  {
    id: 'abc',
    label: 'Chase Sapphire',
    category: 'Credit Card',
    amount: 450,
    month: '2026-06',
    dueDay: 15,
    isRecurring: true,
    recurringSourceId: null,
  },
  {
    id: 'def',
    label: 'Tesla Loan',
    category: 'Car',
    amount: 650.5,
    month: '2026-06',
    isRecurring: false,
    recurringSourceId: null,
  },
]

describe('buildCsvString', () => {
  it('starts with correct header including DueDay', () => {
    const csv = buildCsvString(SAMPLE)
    expect(csv.split('\n')[0]).toBe('Month,Label,Category,Amount,Recurring,DueDay')
  })

  it('formats amount to 2 decimal places', () => {
    const csv = buildCsvString(SAMPLE)
    expect(csv).toContain('650.50')
  })

  it('wraps label with commas in quotes', () => {
    const withComma: Expense[] = [{ ...SAMPLE[0], label: 'Chase, Sapphire' }]
    const csv = buildCsvString(withComma)
    expect(csv).toContain('"Chase, Sapphire"')
  })

  it('includes dueDay when set', () => {
    const csv = buildCsvString(SAMPLE)
    expect(csv.split('\n')[1]).toMatch(/,15$/)
  })

  it('leaves dueDay empty when undefined', () => {
    const csv = buildCsvString(SAMPLE)
    expect(csv.split('\n')[2]).toMatch(/,false,$/)
  })

  it('produces correct row count (header + 2 rows)', () => {
    const csv = buildCsvString(SAMPLE)
    expect(csv.split('\n')).toHaveLength(3)
  })
})
