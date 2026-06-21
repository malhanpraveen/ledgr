import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Category } from '../types'

export function useCategories() {
  const categories = useLiveQuery(() => db.categories.toArray(), [], [])

  async function addCategory(name: string) {
    const existing = await db.categories.where('name').equalsIgnoreCase(name).count()
    if (existing > 0) return
    const cat: Category = { id: crypto.randomUUID(), name, isCustom: true }
    await db.categories.add(cat)
  }

  async function deleteCategory(id: string) {
    await db.categories.delete(id)
  }

  return { categories, addCategory, deleteCategory }
}
