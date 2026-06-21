import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Expense } from '../types'

function prevMonth(month: string): string {
  const [year, m] = month.split('-').map(Number)
  const d = new Date(year, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function useExpenses(month: string) {
  const expenses = useLiveQuery(
    () => db.expenses.where('month').equals(month).toArray(),
    [month],
    [],
  )

  async function addExpense(data: Omit<Expense, 'id' | 'recurringSourceId'>) {
    await db.expenses.add({ ...data, id: crypto.randomUUID(), recurringSourceId: null })
  }

  async function updateExpense(id: string, data: Partial<Omit<Expense, 'id'>>) {
    await db.expenses.update(id, data)
  }

  async function deleteExpense(id: string) {
    await db.expenses.delete(id)
  }

  async function copyRecurringFromPrevMonth() {
    const count = await db.expenses.where('month').equals(month).count()
    if (count > 0) return

    const prev = prevMonth(month)
    const recurring = await db.expenses
      .where('month')
      .equals(prev)
      .filter(e => e.isRecurring)
      .toArray()

    if (recurring.length === 0) return

    const copies: Expense[] = recurring.map(e => ({
      ...e,
      id: crypto.randomUUID(),
      month,
      recurringSourceId: e.id,
    }))

    await db.expenses.bulkAdd(copies)
  }

  return { expenses, addExpense, updateExpense, deleteExpense, copyRecurringFromPrevMonth }
}
