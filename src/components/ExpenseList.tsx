import { useRef, useEffect } from 'react'
import type { Expense } from '../types'

interface Props {
  expenses: Expense[]
  month: string
  onTap: (expense: Expense) => void
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

function sortByDueDay(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => {
    const da = a.dueDay ?? Infinity
    const db = b.dueDay ?? Infinity
    return da - db
  })
}

function currentMonthStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function ExpenseList({ expenses, month, onTap }: Props) {
  const todayDay = new Date().getDate()
  const isCurrentMonth = month === currentMonthStr()
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = listRef.current
    if (!container) return
    let cancelled = false
    import('animejs').then(({ animate, stagger }) => {
      if (cancelled) return
      const rows = container.querySelectorAll('[data-expense-row]')
      if (!rows.length) return
      animate(rows, {
        opacity: [0, 1],
        translateY: [12, 0],
        ease: 'outCubic',
        duration: 250,
        delay: stagger(40),
      })
    })
    return () => { cancelled = true }
  }, [month])

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <span className="text-5xl mb-4">💸</span>
        <p>No expenses yet</p>
        <p className="text-sm">Tap + to add one</p>
      </div>
    )
  }

  const sorted = sortByDueDay(expenses)

  return (
    <div ref={listRef} className="divide-y divide-gray-100">
      {sorted.map(expense => {
        const isPaid = isCurrentMonth && expense.dueDay != null && expense.dueDay <= todayDay
        const isRemaining = isCurrentMonth && (expense.dueDay == null || expense.dueDay > todayDay)

        return (
          <button
            key={expense.id}
            data-expense-row
            onClick={() => onTap(expense)}
            className={`w-full flex items-center justify-between px-4 py-3.5 text-left ${
              isPaid ? 'bg-gray-50 active:bg-gray-100' : 'active:bg-orange-50'
            }`}
          >
            <div>
              <p className="text-sm font-medium tracking-tight text-gray-700">
                {expense.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 tracking-tight">
                {expense.category}
                {expense.dueDay != null && ` · Due ${ordinal(expense.dueDay)}`}
                {expense.isRecurring && ' · ↻'}
                {isPaid && ' · Paid'}
              </p>
            </div>
            <span className={`text-sm font-semibold ml-4 tabular-nums tracking-tight ${
              isPaid ? 'text-green-500' : isRemaining ? 'text-orange-500' : 'text-gray-700'
            }`}>
              ${expense.amount.toFixed(2)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
