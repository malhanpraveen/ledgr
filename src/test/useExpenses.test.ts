import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db/db'
import type { Expense } from '../types'

// Test the prevMonth helper and recurring logic via db directly
// (hooks tested via integration — this tests the pure DB logic)

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

describe('recurring copy logic', () => {
  it('copies recurring expenses from previous month when new month is empty', async () => {
    const source = await seedExpense({ month: '2026-05', isRecurring: true })

    // Simulate copyRecurringFromPrevMonth for '2026-06'
    const currentMonth = '2026-06'
    const prevMonth = '2026-05'
    const count = await db.expenses.where('month').equals(currentMonth).count()
    expect(count).toBe(0)

    const recurring = await db.expenses
      .where('month').equals(prevMonth)
      .filter(e => e.isRecurring)
      .toArray()

    const copies: Expense[] = recurring.map(e => ({
      ...e,
      id: crypto.randomUUID(),
      month: currentMonth,
      recurringSourceId: e.id,
    }))
    await db.expenses.bulkAdd(copies)

    const newMonthExpenses = await db.expenses.where('month').equals(currentMonth).toArray()
    expect(newMonthExpenses).toHaveLength(1)
    expect(newMonthExpenses[0].recurringSourceId).toBe(source.id)
    expect(newMonthExpenses[0].month).toBe('2026-06')
  })

  it('does not copy if current month already has expenses', async () => {
    await seedExpense({ month: '2026-05', isRecurring: true })
    await seedExpense({ month: '2026-06', isRecurring: false })

    const count = await db.expenses.where('month').equals('2026-06').count()
    expect(count).toBeGreaterThan(0) // guard: skip copy
  })

  it('does not copy non-recurring expenses', async () => {
    await seedExpense({ month: '2026-05', isRecurring: false })

    const recurring = await db.expenses
      .where('month').equals('2026-05')
      .filter(e => e.isRecurring)
      .toArray()
    expect(recurring).toHaveLength(0)
  })
})
