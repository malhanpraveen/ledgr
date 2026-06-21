import { useState, useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { db } from '../db/db'
import MonthPicker from '../components/MonthPicker'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

function currentMonthStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function offsetMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number)
  const d = new Date(year, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function shortMonthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number)
  return new Date(year, m - 1, 1).toLocaleString('default', { month: 'short' })
}

export default function AnalyticsView() {
  const [month, setMonth] = useState(currentMonthStr)
  const containerRef = useRef<HTMLDivElement>(null)

  const categoryData = useLiveQuery(async () => {
    const expenses = await db.expenses.where('month').equals(month).toArray()
    const byCategory: Record<string, number> = {}
    for (const e of expenses) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount
    }
    return Object.entries(byCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [month], [])

  const trendData = useLiveQuery(async () => {
    const months = Array.from({ length: 6 }, (_, i) => offsetMonth(month, i - 5))
    return Promise.all(
      months.map(async m => {
        const expenses = await db.expenses.where('month').equals(m).toArray()
        const total = expenses.reduce((sum, e) => sum + e.amount, 0)
        return { month: shortMonthLabel(m), total }
      }),
    )
  }, [month], [])

  const hasData = categoryData && categoryData.length > 0

  // Derive a stable key from categoryData to avoid re-animating unnecessarily
  const categoryKey = categoryData
    .map(d => `${d.name}:${d.value}`)
    .join(',')

  useEffect(() => {
    if (!categoryKey) return
    const container = containerRef.current  // capture BEFORE async gap
    if (!container) return
    let cancelled = false
    import('animejs').then(({ animate, stagger }) => {
      if (cancelled) return
      const bars = container.querySelectorAll('[data-bar]')
      if (!bars?.length) return
      animate(Array.from(bars), {
        width: (el: Element) => (el as HTMLElement).getAttribute('data-pct') + '%',
        ease: 'cubicBezier(.34,1.56,.64,1)',
        delay: stagger(60),
        duration: 550,
      })
    })
    return () => { cancelled = true }
  }, [categoryKey])

  const maxAmount = hasData
    ? Math.max(...categoryData.map(d => d.value))
    : 1

  return (
    <div>
      <MonthPicker month={month} onChange={setMonth} />

      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <span className="text-5xl mb-4">📊</span>
          <p>No data for this month</p>
        </div>
      ) : (
        <div className="px-4 py-6 space-y-8">
          {/* Section 1: Custom animated category bar list */}
          <div>
            <h2 className="text-base font-semibold text-gray-700 mb-4">By Category</h2>
            <div ref={containerRef} className="space-y-4">
              {categoryData.map(({ name, value }, i) => {
                const pct = (value / maxAmount * 100).toFixed(1)
                const color = COLORS[i % COLORS.length]
                return (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{name}</span>
                      <span className="text-gray-600">${value.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        data-bar
                        data-pct={pct}
                        style={{ width: 0, backgroundColor: color }}
                        className="h-2 rounded-full"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Section 2: Recharts 6-month trend line chart */}
          <div>
            <h2 className="text-base font-semibold text-gray-700 mb-4">6-Month Trend</h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData ?? []}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Total']} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
