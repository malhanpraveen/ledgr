import type { Expense } from '../types'

export function buildCsvString(expenses: Expense[]): string {
  const header = 'Month,Label,Category,Amount,Recurring'
  const rows = expenses.map(e => {
    const label = e.label.includes(',') ? `"${e.label}"` : e.label
    return `${e.month},${label},${e.category},${e.amount.toFixed(2)},${e.isRecurring}`
  })
  return [header, ...rows].join('\n')
}

export async function shareCsv(expenses: Expense[]): Promise<void> {
  const csv = buildCsvString(expenses)
  const file = new File([csv], 'expenses.csv', { type: 'text/csv' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Ledgr Export' })
    return
  }

  // Fallback: trigger download
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'expenses.csv'
  a.click()
  URL.revokeObjectURL(url)
}
