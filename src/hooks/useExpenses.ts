import { useState, useEffect } from 'react'
import {
  collection, query, where, onSnapshot,
  doc, setDoc, updateDoc, deleteDoc,
} from 'firebase/firestore'
import { firestore } from '../firebase'
import { useAuth } from './useAuth'
import type { Expense } from '../types'
import { generateId } from '../utils/uuid'
import { copyRecurringExpenses } from '../utils/recurringCopy'

export function useExpenses(month: string) {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const [expenses, setExpenses] = useState<Expense[]>([])

  useEffect(() => {
    if (!uid) { setExpenses([]); return }
    const q = query(
      collection(firestore, 'users', uid, 'expenses'),
      where('month', '==', month),
    )
    return onSnapshot(q, snapshot => {
      setExpenses(snapshot.docs.map(d => d.data() as Expense))
    })
  }, [uid, month])

  async function addExpense(data: Omit<Expense, 'id' | 'recurringSourceId'>) {
    if (!uid) return
    const expense: Expense = { ...data, id: generateId(), recurringSourceId: null }
    await setDoc(doc(firestore, 'users', uid, 'expenses', expense.id), expense)
  }

  async function updateExpense(id: string, data: Partial<Omit<Expense, 'id'>>) {
    if (!uid) return
    const clean = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    )
    await updateDoc(doc(firestore, 'users', uid, 'expenses', id), clean)
  }

  async function deleteExpense(id: string) {
    if (!uid) return
    await deleteDoc(doc(firestore, 'users', uid, 'expenses', id))
  }

  async function copyRecurringFromPrevMonth() {
    if (!uid) return
    await copyRecurringExpenses(uid, month)
  }

  return { expenses, addExpense, updateExpense, deleteExpense, copyRecurringFromPrevMonth }
}
