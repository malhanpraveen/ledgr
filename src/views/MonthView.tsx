import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import MonthPicker from '../components/MonthPicker'
import AddExpenseModal from '../components/AddExpenseModal'
import ExpenseList from '../components/ExpenseList'
import { useExpenses } from '../hooks/useExpenses'
import type { Expense } from '../types'

type ExpenseFormData = Omit<Expense, 'id' | 'recurringSourceId' | 'month'>

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

function isValidMonthParam(s: string | null): s is string {
  return s !== null && MONTH_RE.test(s)
}

function currentMonthStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function MonthView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawParam = searchParams.get('m')
  const month = isValidMonthParam(rawParam) ? rawParam : currentMonthStr()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)

  const { expenses, addExpense, updateExpense, deleteExpense, copyRecurringFromPrevMonth } =
    useExpenses(month)

  const totalRef = useRef<HTMLSpanElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)
  const animationRef = useRef<{ pause: () => void } | null>(null)

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  const todayDay = new Date().getDate()
  const isCurrentMonth = month === currentMonthStr()
  const remaining = isCurrentMonth
    ? expenses.filter(e => e.dueDay == null || e.dueDay > todayDay).reduce((sum, e) => sum + e.amount, 0)
    : 0

  // Copy recurring expenses from previous month when month changes
  useEffect(() => {
    copyRecurringFromPrevMonth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month])

  // Animate total count-up when total changes
  useEffect(() => {
    const el = totalRef.current  // capture before async gap
    if (!el) return
    import('animejs').then(({ animate }) => {
      if (!el) return
      if (animationRef.current) animationRef.current.pause()
      const counter = { value: 0 }
      const anim = animate(counter, {
        value: total,
        ease: 'outCubic',
        duration: 600,
        onUpdate: () => {
          if (el) el.textContent = '$' + counter.value.toFixed(2)
        },
      })
      animationRef.current = anim
    })
  }, [total])

  function handleMonthChange(newMonth: string) {
    setModalOpen(false)
    setEditing(null)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('m', newMonth)
      return next
    })
  }

  function handleSave(data: ExpenseFormData) {
    if (editing) {
      updateExpense(editing.id, data)
    } else {
      addExpense({ ...data, month })
    }
    setModalOpen(false)
    setEditing(null)
  }

  function handleTap(expense: Expense) {
    setEditing(expense)
    setModalOpen(true)
  }

  function handleAdd() {
    const fab = fabRef.current  // capture before async gap
    import('animejs').then(({ animate, createSpring }) => {
      if (fab) {
        animate(fab, {
          scale: [0.85, 1.05, 1],
          ease: createSpring({ stiffness: 400, damping: 15 }),
        })
      }
    })
    setEditing(null)
    setModalOpen(true)
  }

  function handleDelete() {
    if (editing) {
      deleteExpense(editing.id)
    }
    setModalOpen(false)
    setEditing(null)
  }

  return (
    <div className="relative min-h-full">
      <MonthPicker month={month} onChange={handleMonthChange} />

      <div className="px-4 py-4 border-b flex items-center justify-between">
        <div className="flex gap-6">
          <div>
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-3xl font-bold text-gray-800">
              <span ref={totalRef}>$0.00</span>
            </p>
          </div>
          {isCurrentMonth && remaining > 0 && (
            <div>
              <p className="text-sm text-gray-500">Remaining</p>
              <p className="text-3xl font-bold text-orange-400">
                ${remaining.toFixed(2)}
              </p>
            </div>
          )}
        </div>
        <button
          ref={fabRef}
          onClick={handleAdd}
          className="w-12 h-12 bg-blue-500 text-white text-2xl rounded-full shadow-md flex items-center justify-center active:bg-blue-600"
          aria-label="Add expense"
        >
          +
        </button>
      </div>

      <ExpenseList expenses={expenses} month={month} onTap={handleTap} />

      <AddExpenseModal
        open={modalOpen}
        initial={editing}
        onSave={handleSave}
        onDelete={editing ? handleDelete : undefined}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
