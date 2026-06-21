import { useRef, useState } from 'react'
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore'
import { useCategories } from '../hooks/useCategories'
import { useAuth } from '../hooks/useAuth'
import { useBiometric } from '../hooks/useBiometric'
import { firestore } from '../firebase'
import { shareCsv } from '../utils/exportCsv'
import type { Expense } from '../types'

export default function SettingsView() {
  const { categories, addCategory, deleteCategory } = useCategories()
  const { user, logout } = useAuth()
  const uid = user?.uid
  const { isRegistered, isSupported, register, unregister } = useBiometric(uid)
  const [newCategory, setNewCategory] = useState('')
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [adding, setAdding] = useState(false)
  const [bioMsg, setBioMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleExportCsv() {
    if (!uid) return
    setExporting(true)
    try {
      const snapshot = await getDocs(collection(firestore, 'users', uid, 'expenses'))
      const all = snapshot.docs.map(d => d.data() as Expense)
      await shareCsv(all)
    } finally {
      setExporting(false)
    }
  }

  async function handleExportJson() {
    if (!uid) return
    const snapshot = await getDocs(collection(firestore, 'users', uid, 'expenses'))
    const all = snapshot.docs.map(d => d.data())
    const json = JSON.stringify(all, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ledgr-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uid) return
    setImporting(true)
    setImportMsg('')
    try {
      const text = await file.text()
      const data: Expense[] = JSON.parse(text)
      if (!Array.isArray(data)) throw new Error('Invalid format')

      const snapshot = await getDocs(collection(firestore, 'users', uid, 'expenses'))
      const existingIds = new Set(snapshot.docs.map(d => d.id))
      const newExpenses = data.filter(e => e.id && e.label && !existingIds.has(e.id))
      if (newExpenses.length === 0) {
        setImportMsg('No new expenses to import.')
        return
      }
      const batch = writeBatch(firestore)
      newExpenses.forEach(expense => {
        batch.set(doc(firestore, 'users', uid!, 'expenses', expense.id), expense)
      })
      await batch.commit()
      setImportMsg(`✓ Imported ${newExpenses.length} expense${newExpenses.length > 1 ? 's' : ''}.`)
    } catch {
      setImportMsg('Import failed — invalid file.')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
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

  return (
    <div className="px-4 py-4 space-y-8">
      <h1 className="text-xl font-bold text-gray-800">Settings</h1>

      {/* Account */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Account</h2>
        <p className="text-sm text-gray-500 mb-3">{user?.email}</p>
        <button
          onClick={logout}
          className="w-full py-3 border border-red-300 text-red-400 rounded-xl font-semibold"
        >
          Sign Out
        </button>
      </section>

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

      {/* Security */}
      {isSupported && (
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Security</h2>
          <div className="space-y-3">
            {isRegistered ? (
              <button
                onClick={() => { unregister(); setBioMsg('Face ID disabled.') }}
                className="w-full py-3 border border-red-300 text-red-400 rounded-xl font-semibold"
              >
                Disable Face ID
              </button>
            ) : (
              <button
                onClick={async () => {
                  if (!user?.email) return
                  const ok = await register(user.email)
                  setBioMsg(ok ? '✓ Face ID enabled' : 'Failed — try again.')
                }}
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold"
              >
                Enable Face ID
              </button>
            )}
            {bioMsg && (
              <p className={`text-sm text-center ${bioMsg.startsWith('✓') ? 'text-green-500' : 'text-red-400'}`}>
                {bioMsg}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Data */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Data</h2>
        <div className="space-y-3">
          <button
            onClick={handleExportJson}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold"
          >
            📦 Export Backup (JSON)
          </button>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportJson}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="w-full py-3 border border-blue-500 text-blue-500 rounded-xl font-semibold disabled:opacity-50"
            >
              {importing ? 'Importing...' : '📥 Import Backup (JSON)'}
            </button>
            {importMsg && (
              <p className={`text-sm mt-2 text-center ${importMsg.startsWith('✓') ? 'text-green-500' : 'text-red-400'}`}>
                {importMsg}
              </p>
            )}
          </div>
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold disabled:opacity-50"
          >
            {exporting ? 'Preparing...' : '📤 Share CSV'}
          </button>
          <p className="text-xs text-gray-400 text-center">
            Export JSON on old device → Import JSON on new device
          </p>
        </div>
      </section>
    </div>
  )
}
