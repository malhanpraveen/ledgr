import { useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../db/db'
import { formatMonthLabel } from '../utils/formatMonth'

export default function HistoryView() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)

  const months = useLiveQuery(async () => {
    const all = await db.expenses.toArray()
    const byMonth: Record<string, number> = {}
    for (const e of all) {
      byMonth[e.month] = (byMonth[e.month] ?? 0) + e.amount
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, total]) => ({ month, total }))
  }, [], [])

  // Stable key: only re-fire animation when month keys or totals change
  const monthsKey = months.map(m => `${m.month}:${m.total}`).join(',')

  useEffect(() => {
    if (!monthsKey) return
    const container = containerRef.current  // capture BEFORE async gap
    if (!container) return
    let cancelled = false
    import('animejs').then(({ animate, stagger }) => {
      if (cancelled) return
      const rows = container.querySelectorAll('[data-month-row]')
      if (!rows.length) return
      animate(Array.from(rows), {
        opacity: [0, 1],
        translateX: [-12, 0],
        ease: 'outCubic',
        duration: 220,
        delay: stagger(35),
      })
    })
    return () => { cancelled = true }
  }, [monthsKey])

  if (months.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <span className="text-5xl mb-4">🗓️</span>
        <p>No history yet</p>
      </div>
    )
  }

  return (
    <div>
      <div className="px-4 py-4 border-b">
        <h1 className="text-xl font-bold text-gray-800">History</h1>
      </div>
      <div ref={containerRef} className="divide-y divide-gray-100">
        {months.map(({ month, total }) => (
          <button
            key={month}
            data-month-row
            onClick={() => navigate(`/month?m=${month}`)}
            className="w-full flex items-center justify-between px-4 py-5 active:bg-gray-50 text-left"
          >
            <span className="font-medium text-gray-800">{formatMonthLabel(month)}</span>
            <span className="font-semibold text-gray-700">${total.toFixed(2)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
