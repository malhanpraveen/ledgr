import Dexie, { type Table } from 'dexie'
import type { Expense, Category, Setting } from '../types'

class ExpenseTrackerDB extends Dexie {
  expenses!: Table<Expense>
  categories!: Table<Category>
  settings!: Table<Setting>

  constructor() {
    super('ExpenseTrackerDB')
    this.version(1).stores({
      expenses: 'id, month, category',
      categories: 'id, name',
      settings: 'key',
    })
  }
}

export const db = new ExpenseTrackerDB()

const BUILT_IN_CATEGORIES: Category[] = [
  { id: 'credit_card', name: 'Credit Card', isCustom: false },
  { id: 'mortgage', name: 'Mortgage', isCustom: false },
  { id: 'car', name: 'Car', isCustom: false },
  { id: 'utilities', name: 'Utilities', isCustom: false },
  { id: 'other', name: 'Other', isCustom: false },
]

export async function seedCategories(): Promise<void> {
  const count = await db.categories.count()
  if (count === 0) {
    await db.categories.bulkAdd(BUILT_IN_CATEGORIES)
  }
}
