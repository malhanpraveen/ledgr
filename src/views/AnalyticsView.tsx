import { useState, useEffect, useRef } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { firestore } from '../firebase'
import { useAuth } from '../hooks/useAuth'
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
  const { user } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<{ cancel: () => void } | null>(null)

  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([])
  const [trendData, setTrendData] = useState<{ month: string; total: number }[]>([])

  useEffect(() => {
    const uid = user?.uid
    if (!uid) return
    return onSnapshot(collection(firestore, 'users', uid, 'expenses'), snapshot => {
      const all = snapshot.docs.map(d => d.data())

      // Category breakdown for selected month
      const byCategory: Record<string, number> = {}
      for (const e of all) {
        if (e.month !== month) continue
        byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount
      }
      setCategoryData(
        Object.entries(byCategory)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
      )

      // 6-month trend
      const trendMonths = Array.from({ length: 6 }, (_, i) => offsetMonth(month, i - 5))
      const byMonth: Record<string, number> = {}
      for (const e of all) {
        if (trendMonths.includes(e.month)) {
          byMonth[e.month] = (byMonth[e.month] ?? 0) + e.amount
        }
      }
      setTrendData(trendMonths.map(m => ({ month: shortMonthLabel(m), total: byMonth[m] ?? 0 })))
    })
  }, [user?.uid, month])

  const hasData = categoryData.length > 0

  const categoryKey = categoryData.map(d => `${d.name}:${d.value}`).join(',')

  useEffect(() => {
    if (!categoryKey) return
    const container = containerRef.current
    if (!container) return
    let cancelled = false
    import('animejs').then(({ animate, stagger }) => {
      if (cancelled) return
      const bars = container.querySelectorAll('[data-bar]')
      if (!bars.length) return
      bars.forEach(el => { (el as HTMLElement).style.width = '0%' })
      animRef.current = animate(bars, {
        width: (el?: HTMLElement | SVGElement | Record<string, unknown>) => (el as HTMLElement).getAttribute('data-pct') + '%',
        ease: 'cubicBezier(.34,1.56,.64,1)',
        delay: stagger(60),
        duration: 550,
      })
    })
    return () => {
      cancelled = true
      animRef.current?.cancel()
      animRef.current = null
    }
  }, [categoryKey])

  const maxAmount = hasData ? Math.max(...categoryData.map(d => d.value), 1) : 1

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
                        style={{ width: '0%', backgroundColor: color }}
                        className="h-2 rounded-full"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-700 mb-4">6-Month Trend</h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Total']} />
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
