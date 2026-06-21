export function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number)
  return new Date(year, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}
