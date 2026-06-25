import type { Expense } from '../types'

export interface ParseCsvResult {
  expenses: Omit<Expense, 'id' | 'recurringSourceId'>[]
  newCategories: string[]
  errors: string[]
}

export function parseCsv(csv: string, existingCategories: Set<string>): ParseCsvResult {
  const lines = csv.split('\n').map(l => l.trim()).filter(Boolean)
  const expenses: Omit<Expense, 'id' | 'recurringSourceId'>[] = []
  const newCategories: string[] = []
  const newCategorySet = new Set<string>()
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    if (cols.length < 5) {
      errors.push(`Row ${i + 1}: insufficient columns`)
      continue
    }
    const [month, label, category, amountStr, recurringStr, dueDayStr] = cols

    if (!/^\d{4}-\d{2}$/.test(month.trim())) {
      errors.push(`Row ${i + 1}: invalid month "${month}"`)
      continue
    }
    if (!label.trim()) {
      errors.push(`Row ${i + 1}: missing label`)
      continue
    }
    const amount = parseFloat(amountStr)
    if (isNaN(amount)) {
      errors.push(`Row ${i + 1}: invalid amount "${amountStr}"`)
      continue
    }

    const cat = category.trim() || 'Other'
    if (!existingCategories.has(cat) && !newCategorySet.has(cat)) {
      newCategories.push(cat)
      newCategorySet.add(cat)
    }

    const parsedDueDay = dueDayStr?.trim() ? parseInt(dueDayStr.trim(), 10) : NaN
    const dueDay = !isNaN(parsedDueDay) ? parsedDueDay : undefined

    expenses.push({
      label: label.trim(),
      category: cat,
      amount,
      month: month.trim(),
      isRecurring: recurringStr?.trim().toLowerCase() === 'true',
      ...(dueDay !== undefined ? { dueDay } : {}),
    })
  }

  return { expenses, newCategories, errors }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current)
  return result
}
