import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore'
import { firestore } from '../firebase'
import type { Expense } from '../types'
import { generateId } from './uuid'

function prevMonth(month: string): string {
  const [year, m] = month.split('-').map(Number)
  const d = new Date(year, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function copyRecurringExpenses(uid: string, month: string): Promise<void> {
  const expensesCol = collection(firestore, 'users', uid, 'expenses')

  const existing = await getDocs(query(expensesCol, where('month', '==', month)))
  if (!existing.empty) return

  const prev = prevMonth(month)
  const prevSnap = await getDocs(query(expensesCol, where('month', '==', prev)))
  const recurring = prevSnap.docs.filter(d => d.data().isRecurring === true)
  if (recurring.length === 0) return

  const batch = writeBatch(firestore)
  recurring.forEach(d => {
    const e = d.data() as Expense
    const copy: Expense = { ...e, id: generateId(), month, recurringSourceId: e.id }
    batch.set(doc(expensesCol, copy.id), copy)
  })
  await batch.commit()
}
