interface MonthPickerProps {
  month: string        // "YYYY-MM"
  onChange: (month: string) => void
}

function formatLabel(month: string): string {
  const [year, m] = month.split('-').map(Number)
  const date = new Date(year, m - 1, 1)
  return date.toLocaleString('default', { month: 'long', year: 'numeric' })
}

function offsetMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number)
  const d = new Date(year, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function MonthPicker({ month, onChange }: MonthPickerProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-blue-500 text-white">
      <button
        onClick={() => onChange(offsetMonth(month, -1))}
        className="text-2xl px-2 active:opacity-60"
        aria-label="Previous month"
      >
        ‹
      </button>
      <span className="font-semibold text-lg">{formatLabel(month)}</span>
      <button
        onClick={() => onChange(offsetMonth(month, 1))}
        className="text-2xl px-2 active:opacity-60"
        aria-label="Next month"
      >
        ›
      </button>
    </div>
  )
}
