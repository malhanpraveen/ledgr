import { useState } from 'react'
import { useCategories } from '../hooks/useCategories'
import { usePin } from '../hooks/usePin'
import { db } from '../db/db'
import { shareCsv } from '../utils/exportCsv'
import PINScreen from '../components/PINScreen'

type PinMode = 'set' | null

export default function SettingsView() {
  const { categories, addCategory, deleteCategory } = useCategories()
  const { hasPin, setPin, removePin } = usePin()
  const [newCategory, setNewCategory] = useState('')
  const [pinMode, setPinMode] = useState<PinMode>(null)
  const [exporting, setExporting] = useState(false)
  const [adding, setAdding] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const all = await db.expenses.toArray()
      await shareCsv(all)
    } finally {
      setExporting(false)
    }
  }

  async function handleAddCategory() {
    const name = newCategory.trim()
    if (!name || adding) return
    setAdding(true)
    try {
      await addCategory(name)
      setNewCategory('')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemovePin() {
    try {
      await removePin()
    } catch {
      alert('Failed to remove PIN. Try again.')
    }
  }

  if (pinMode) {
    return (
      <PINScreen
        mode={pinMode}
        onSuccess={async (pin) => {
          try {
            await setPin(pin)
          } finally {
            setPinMode(null)
          }
        }}
        onCancel={() => setPinMode(null)}
      />
    )
  }

  return (
    <div className="px-4 py-4 space-y-8">
      <h1 className="text-xl font-bold text-gray-800">Settings</h1>

      {/* Categories */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Categories</h2>
        <div className="space-y-2">
          {categories.map(c => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-800">{c.name}</span>
              {c.isCustom && (
                <button
                  onClick={() => deleteCategory(c.id)}
                  className="text-red-400 text-sm px-2"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <input
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500"
            placeholder="New category name"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
          />
          <button
            onClick={handleAddCategory}
            disabled={adding}
            className="bg-blue-500 text-white px-4 py-2 rounded-xl font-semibold disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </section>

      {/* PIN */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Security</h2>
        <div className="space-y-3">
          {!hasPin ? (
            <button
              onClick={() => setPinMode('set')}
              className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold"
            >
              Set PIN
            </button>
          ) : (
            <>
              <button
                onClick={() => setPinMode('set')}
                className="w-full py-3 border border-blue-500 text-blue-500 rounded-xl font-semibold"
              >
                Change PIN
              </button>
              <button
                onClick={handleRemovePin}
                className="w-full py-3 border border-red-300 text-red-400 rounded-xl font-semibold"
              >
                Remove PIN
              </button>
            </>
          )}
        </div>
      </section>

      {/* Export */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Data</h2>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold disabled:opacity-50"
        >
          {exporting ? 'Preparing...' : '📤 Share CSV'}
        </button>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Opens iOS share sheet — choose Mail, AirDrop, or Files
        </p>
      </section>
    </div>
  )
}
