import { useState, useEffect, useRef } from 'react'
import { useCategories } from '../hooks/useCategories'
import type { Expense } from '../types'

type ExpenseFormData = Omit<Expense, 'id' | 'recurringSourceId' | 'month'>

interface AddExpenseModalProps {
  open: boolean
  initial?: Expense | null       // if set, modal is in edit mode
  onSave: (data: ExpenseFormData) => void
  onDelete?: () => void          // only shown in edit mode
  onClose: () => void
}

interface ModalFormProps {
  initial?: Expense | null
  categories: { id: string; name: string }[]
  onSave: (data: ExpenseFormData) => void
  onDelete?: () => void
  onClose: () => void
}

function ModalForm({ initial, categories, onSave, onDelete, onClose }: ModalFormProps) {
  const [label, setLabel] = useState(() => initial?.label ?? '')
  const [category, setCategory] = useState(
    () => initial?.category ?? categories[0]?.name ?? ''
  )
  const [amount, setAmount] = useState(() =>
    initial ? initial.amount.toString() : ''
  )
  const [isRecurring, setIsRecurring] = useState(() => initial?.isRecurring ?? false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (!label.trim() || isNaN(parsed) || parsed < 0.01) return
    onSave({ label: label.trim(), category, amount: parsed, isRecurring })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-600 mb-1">Label</label>
        <input
          className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
          placeholder="e.g. Chase Sapphire"
          value={label}
          onChange={e => setLabel(e.target.value)}
          autoFocus
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Category</label>
        <select
          className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          {categories.map(c => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Amount (USD)</label>
        <input
          className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
          type="number"
          inputMode="decimal"
          placeholder="0.00"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
      </div>
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-600">Recurring monthly</label>
        <button
          type="button"
          onClick={() => setIsRecurring(v => !v)}
          className={`w-12 h-6 rounded-full transition-colors ${isRecurring ? 'bg-blue-500' : 'bg-gray-300'}`}
        >
          <span
            className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${isRecurring ? 'translate-x-6' : ''}`}
          />
        </button>
      </div>
      <div className="flex gap-3 pt-2">
        {onDelete && (
          <button
            type="button"
            onClick={() => { onDelete(); onClose() }}
            className="flex-1 py-3 border border-red-300 text-red-500 rounded-xl font-semibold"
          >
            Delete
          </button>
        )}
        <button
          type="submit"
          className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-semibold"
        >
          {initial ? 'Save' : 'Add'}
        </button>
      </div>
    </form>
  )
}

export default function AddExpenseModal({ open, initial, onSave, onDelete, onClose }: AddExpenseModalProps) {
  const { categories } = useCategories()
  const sheetRef = useRef<HTMLDivElement>(null)

  // Slide-up spring animation when modal opens
  useEffect(() => {
    if (!open) return
    const el = sheetRef.current   // capture before async gap
    import('animejs').then(({ animate, createSpring }) => {
      if (!el) return
      animate(el, {
        translateY: ['100%', '0%'],
        ease: createSpring({ stiffness: 300, damping: 20 }),
      })
    })
  }, [open])

  if (!open) return null

  const formKey = `${open ? 'open' : 'closed'}-${initial?.id ?? 'new'}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/40"
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        className="bg-white w-full rounded-t-2xl p-6 pb-24 max-w-md mx-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4 text-gray-800">
          {initial ? 'Edit Expense' : 'Add Expense'}
        </h2>
        <ModalForm
          key={formKey}
          initial={initial}
          categories={categories}
          onSave={onSave}
          onDelete={onDelete}
          onClose={onClose}
        />
      </div>
    </div>
  )
}
