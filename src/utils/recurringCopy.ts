import { db } from '../db/db'
import type { Expense } from '../types'

function prevMonth(month: string): string {
  const [year, m] = month.split('-').map(Number)
  const d = new Date(year, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function copyRecurringExpenses(month: string): Promise<void> {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  if (month > currentMonth) return  // don't pre-populate future months

  await db.transaction('rw', db.expenses, async () => {
    const count = await db.expenses.where('month').equals(month).count()
    if (count > 0) return
    const prev = prevMonth(month)
    const recurring = await db.expenses
      .where('month').equals(prev)
      .filter((e: Expense) => e.isRecurring)
      .toArray()
    if (recurring.length === 0) return
    const copies: Expense[] = recurring.map((e: Expense) => ({
      ...e,
      id: crypto.randomUUID(),
      month,
      recurringSourceId: e.id,
    }))
    await db.expenses.bulkAdd(copies)
  })
}
