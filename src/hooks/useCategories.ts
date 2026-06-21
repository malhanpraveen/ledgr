import { useState, useEffect } from 'react'
import {
  collection, query, orderBy, onSnapshot,
  doc, setDoc, deleteDoc,
} from 'firebase/firestore'
import { firestore } from '../firebase'
import { useAuth } from './useAuth'
import type { Category } from '../types'
import { generateId } from '../utils/uuid'

export function useCategories() {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    if (!uid) { setCategories([]); return }
    const q = query(
      collection(firestore, 'users', uid, 'categories'),
      orderBy('name'),
    )
    return onSnapshot(q, snapshot => {
      setCategories(snapshot.docs.map(d => d.data() as Category))
    })
  }, [uid])

  async function addCategory(name: string) {
    if (!uid) return
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) return
    const cat: Category = { id: generateId(), name, isCustom: true }
    await setDoc(doc(firestore, 'users', uid, 'categories', cat.id), cat)
  }

  async function deleteCategory(id: string) {
    if (!uid) return
    await deleteDoc(doc(firestore, 'users', uid, 'categories', id))
  }

  return { categories, addCategory, deleteCategory }
}
