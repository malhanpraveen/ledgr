import { useRef, useEffect } from 'react'
import type { Expense } from '../types'

interface Props {
  expenses: Expense[]
  onTap: (expense: Expense) => void
}

function groupByCategory(expenses: Expense[]): Record<string, Expense[]> {
  return expenses.reduce<Record<string, Expense[]>>((acc, e) => {
    if (!acc[e.category]) acc[e.category] = []
    acc[e.category].push(e)
    return acc
  }, {})
}

export default function ExpenseList({ expenses, onTap }: Props) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = listRef.current  // capture before async gap
    if (!container) return
    import('animejs').then(({ animate, stagger }) => {
      const rows = container.querySelectorAll('[data-expense-row]')
      if (!rows.length) return
      animate(Array.from(rows), {
        opacity: [0, 1],
        translateY: [12, 0],
        ease: 'outCubic',
        duration: 250,
        delay: stagger(40),
      })
    })
  }, [expenses])

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <span className="text-5xl mb-4">💸</span>
        <p>No expenses yet</p>
        <p className="text-sm">Tap + to add one</p>
      </div>
    )
  }

  const grouped = groupByCategory(expenses)

  return (
    <div ref={listRef} className="divide-y divide-gray-100">
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {cat}
          </div>
          {items.map(expense => (
            <button
              key={expense.id}
              data-expense-row
              onClick={() => onTap(expense)}
              className="w-full flex items-center justify-between px-4 py-4 active:bg-gray-50 text-left"
            >
              <div>
                <p className="font-medium text-gray-800">{expense.label}</p>
                {expense.isRecurring && (
                  <p className="text-xs text-blue-400">↻ Recurring</p>
                )}
              </div>
              <span className="font-semibold text-gray-800">
                ${expense.amount.toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
