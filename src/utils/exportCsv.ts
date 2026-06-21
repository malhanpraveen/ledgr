import type { Expense } from '../types'

function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

export function buildCsvString(expenses: Expense[]): string {
  const header = 'Month,Label,Category,Amount,Recurring'
  const rows = expenses.map(e => {
    return `${e.month},${csvField(e.label)},${csvField(e.category)},${e.amount.toFixed(2)},${e.isRecurring}`
  })
  return [header, ...rows].join('\n')
}

export async function shareCsv(expenses: Expense[]): Promise<void> {
  const csv = buildCsvString(expenses)
  const file = new File([csv], 'expenses.csv', { type: 'text/csv' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Ledgr Export' })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      throw err
    }
    return
  }

  // Fallback: trigger download
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'expenses.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}
