import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import MonthPicker from '../components/MonthPicker'
import AddExpenseModal from '../components/AddExpenseModal'
import ExpenseList from '../components/ExpenseList'
import { useExpenses } from '../hooks/useExpenses'
import type { Expense } from '../types'

type ExpenseFormData = Omit<Expense, 'id' | 'recurringSourceId' | 'month'>

function currentMonthStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function isValidMonthParam(s: string | null): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}$/.test(s)
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

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

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
      animate({ value: 0 }, {
        value: total,
        ease: 'outCubic',
        duration: 600,
        onUpdate: (anim: { targets: Array<{ value: number }> }) => {
          if (el) el.textContent = '$' + Number(anim.targets[0].value).toFixed(2)
        },
      })
    })
  }, [total])

  function handleMonthChange(newMonth: string) {
    setSearchParams({ m: newMonth })
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

      <div className="px-4 py-4 border-b">
        <p className="text-sm text-gray-500">Total</p>
        <p className="text-3xl font-bold text-gray-800">
          <span ref={totalRef}>${total.toFixed(2)}</span>
        </p>
      </div>

      <ExpenseList expenses={expenses} onTap={handleTap} />

      {/* FAB */}
      <button
        ref={fabRef}
        onClick={handleAdd}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-500 text-white text-3xl rounded-full shadow-lg flex items-center justify-center active:bg-blue-600"
        aria-label="Add expense"
      >
        +
      </button>

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
