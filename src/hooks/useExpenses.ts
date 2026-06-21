import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Expense } from '../types'
import { copyRecurringExpenses } from '../utils/recurringCopy'

export function useExpenses(month: string) {
  const expenses = useLiveQuery(
    () => db.expenses.where('month').equals(month).toArray(),
    [month],
    [],
  )

  async function addExpense(data: Omit<Expense, 'id' | 'recurringSourceId'>) {
    await db.expenses.add({ ...data, month, id: crypto.randomUUID(), recurringSourceId: null })
  }

  async function updateExpense(id: string, data: Partial<Omit<Expense, 'id'>>) {
    const clean = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    ) as Partial<Omit<Expense, 'id'>>
    await db.expenses.update(id, clean)
  }

  async function deleteExpense(id: string) {
    await db.expenses.delete(id)
  }

  async function copyRecurringFromPrevMonth() {
    await copyRecurringExpenses(month)
  }

  return { expenses, addExpense, updateExpense, deleteExpense, copyRecurringFromPrevMonth }
}
