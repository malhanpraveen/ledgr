import { describe, it, expect } from 'vitest'
import { parseCsv } from '../utils/importCsv'

const EXISTING = new Set(['Credit Card', 'Car', 'Other', 'Utilities'])

const VALID_CSV = `Month,Label,Category,Amount,Recurring,DueDay
2026-06,Netflix,Entertainment,15.99,true,5
2026-06,Rent,Other,2000.00,false,`

describe('parseCsv', () => {
  it('skips header row', () => {
    const { expenses } = parseCsv(VALID_CSV, EXISTING)
    expect(expenses).toHaveLength(2)
  })

  it('parses label, category, amount, month', () => {
    const { expenses } = parseCsv(VALID_CSV, EXISTING)
    expect(expenses[0]).toMatchObject({
      label: 'Netflix',
      category: 'Entertainment',
      amount: 15.99,
      month: '2026-06',
    })
  })

  it('parses isRecurring true/false', () => {
    const { expenses } = parseCsv(VALID_CSV, EXISTING)
    expect(expenses[0].isRecurring).toBe(true)
    expect(expenses[1].isRecurring).toBe(false)
  })

  it('parses dueDay when present', () => {
    const { expenses } = parseCsv(VALID_CSV, EXISTING)
    expect(expenses[0].dueDay).toBe(5)
  })

  it('sets dueDay undefined when column is empty', () => {
    const { expenses } = parseCsv(VALID_CSV, EXISTING)
    expect(expenses[1].dueDay).toBeUndefined()
  })

  it('flags unknown categories in newCategories', () => {
    const { newCategories } = parseCsv(VALID_CSV, EXISTING)
    expect(newCategories).toContain('Entertainment')
  })

  it('does not flag known categories', () => {
    const { newCategories } = parseCsv(VALID_CSV, EXISTING)
    expect(newCategories).not.toContain('Other')
  })

  it('deduplicates newCategories across rows', () => {
    const csv = `Month,Label,Category,Amount,Recurring,DueDay
2026-06,A,NewCat,10,false,
2026-06,B,NewCat,20,false,`
    const { newCategories } = parseCsv(csv, EXISTING)
    expect(newCategories.filter(c => c === 'NewCat')).toHaveLength(1)
  })

  it('skips row with invalid month format', () => {
    const csv = `Month,Label,Category,Amount,Recurring,DueDay\n06-2026,Bad,Other,10,false,`
    const { expenses, errors } = parseCsv(csv, EXISTING)
    expect(expenses).toHaveLength(0)
    expect(errors[0]).toContain('invalid month')
  })

  it('skips row with non-numeric amount', () => {
    const csv = `Month,Label,Category,Amount,Recurring,DueDay\n2026-06,Bad,Other,abc,false,`
    const { expenses, errors } = parseCsv(csv, EXISTING)
    expect(expenses).toHaveLength(0)
    expect(errors[0]).toContain('invalid amount')
  })

  it('skips row with missing label', () => {
    const csv = `Month,Label,Category,Amount,Recurring,DueDay\n2026-06,,Other,10,false,`
    const { expenses, errors } = parseCsv(csv, EXISTING)
    expect(expenses).toHaveLength(0)
    expect(errors[0]).toContain('missing label')
  })

  it('handles quoted fields containing commas', () => {
    const csv = `Month,Label,Category,Amount,Recurring,DueDay\n2026-06,"Chase, Sapphire",Credit Card,450,true,15`
    const { expenses } = parseCsv(csv, EXISTING)
    expect(expenses[0].label).toBe('Chase, Sapphire')
  })

  it('skips blank lines between rows', () => {
    const csv = `Month,Label,Category,Amount,Recurring,DueDay\n\n2026-06,Netflix,Other,15.99,false,\n`
    const { expenses } = parseCsv(csv, EXISTING)
    expect(expenses).toHaveLength(1)
  })
})
