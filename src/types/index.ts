export interface Expense {
  id: string
  label: string
  category: string
  amount: number
  month: string        // "YYYY-MM"
  isRecurring: boolean
  recurringSourceId: string | null
}

export interface Category {
  id: string
  name: string
  isCustom: boolean
}

export interface Setting {
  key: string
  value: string
}
