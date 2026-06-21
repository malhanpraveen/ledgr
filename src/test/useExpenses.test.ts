import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db/db'
import { copyRecurringExpenses } from '../utils/recurringCopy'
import type { Expense } from '../types'

async function seedExpense(overrides: Partial<Expense> = {}): Promise<Expense> {
  const e: Expense = {
    id: crypto.randomUUID(),
    label: 'Test',
    category: 'Other',
    amount: 100,
    month: '2026-05',
    isRecurring: true,
    recurringSourceId: null,
    ...overrides,
  }
  await db.expenses.add(e)
  return e
}

beforeEach(async () => {
  await db.expenses.clear()
})

describe('copyRecurringExpenses', () => {
  it('copies recurring expenses from prev month when new month is empty', async () => {
    const source = await seedExpense({ month: '2026-05', isRecurring: true })
    await copyRecurringExpenses('2026-06')
    const copied = await db.expenses.where('month').equals('2026-06').toArray()
    expect(copied).toHaveLength(1)
    expect(copied[0].recurringSourceId).toBe(source.id)
    expect(copied[0].month).toBe('2026-06')
    expect(copied[0].id).not.toBe(source.id)
  })

  it('does not copy when current month already has expenses', async () => {
    await seedExpense({ month: '2026-05', isRecurring: true })
    await seedExpense({ month: '2026-06', isRecurring: false })
    await copyRecurringExpenses('2026-06')
    const all = await db.expenses.where('month').equals('2026-06').toArray()
    expect(all).toHaveLength(1) // only the pre-existing one
  })

  it('does not copy non-recurring expenses', async () => {
    await seedExpense({ month: '2026-05', isRecurring: false })
    await copyRecurringExpenses('2026-06')
    const copied = await db.expenses.where('month').equals('2026-06').toArray()
    expect(copied).toHaveLength(0)
  })
})
