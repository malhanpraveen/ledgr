import { doc, setDoc } from 'firebase/firestore'
import { firestore } from '../firebase'
import type { Category } from '../types'

export const BUILT_IN_CATEGORIES: Category[] = [
  { id: 'credit_card', name: 'Credit Card', isCustom: false },
  { id: 'mortgage', name: 'Mortgage', isCustom: false },
  { id: 'car', name: 'Car', isCustom: false },
  { id: 'utilities', name: 'Utilities', isCustom: false },
  { id: 'other', name: 'Other', isCustom: false },
]

export async function seedCategories(uid: string): Promise<void> {
  await Promise.all(
    BUILT_IN_CATEGORIES.map(cat =>
      setDoc(doc(firestore, 'users', uid, 'categories', cat.id), cat, { merge: true })
    )
  )
}
