import { useRef, useState } from 'react'
import { collection, getDocs, doc, writeBatch, setDoc } from 'firebase/firestore'
import { useCategories } from '../hooks/useCategories'
import { useAuth } from '../hooks/useAuth'
import { firestore } from '../firebase'
import { shareCsv } from '../utils/exportCsv'
import { parseCsv } from '../utils/importCsv'
import { generateId } from '../utils/uuid'
import type { Expense } from '../types'
import { extractStatement } from '../utils/importStatement'
import type { StatementData } from '../utils/importStatement'

export default function SettingsView() {
  const { categories, addCategory, deleteCategory } = useCategories()
  const { user, logout } = useAuth()
  const uid = user?.uid
  const [newCategory, setNewCategory] = useState('')
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [adding, setAdding] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const csvFileInputRef = useRef<HTMLInputElement>(null)
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvImportMsg, setCsvImportMsg] = useState('')
  const statementFileInputRef = useRef<HTMLInputElement>(null)
  const [statementLoading, setStatementLoading] = useState(false)
  const [statementData, setStatementData] = useState<StatementData | null>(null)
  const [statementError, setStatementError] = useState('')
  const [statementSaving, setStatementSaving] = useState(false)

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

  async function handleImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uid) return
    setCsvImporting(true)
    setCsvImportMsg('')
    try {
      const text = await file.text()
      const existingCats = new Set(categories.map(c => c.name))
      const { expenses, newCategories, errors } = parseCsv(text, existingCats)

      for (const name of newCategories) {
        await addCategory(name)
      }

      if (expenses.length === 0) {
        setCsvImportMsg(errors.length ? `Import failed: ${errors[0]}` : 'No valid expenses found.')
        return
      }

      const batch = writeBatch(firestore)
      expenses.forEach(data => {
        const expense: Expense = { ...data, id: generateId(), recurringSourceId: null }
        batch.set(doc(firestore, 'users', uid!, 'expenses', expense.id), expense)
      })
      await batch.commit()

      const catMsg = newCategories.length
        ? ` (${newCategories.length} new categor${newCategories.length > 1 ? 'ies' : 'y'} created)`
        : ''
      setCsvImportMsg(`✓ Imported ${expenses.length} expense${expenses.length > 1 ? 's' : ''}${catMsg}.`)
    } catch {
      setCsvImportMsg('Import failed — invalid file.')
    } finally {
      setCsvImporting(false)
      if (csvFileInputRef.current) csvFileInputRef.current.value = ''
    }
  }

  async function handleImportStatement(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3_000_000) {
      setStatementError('File too large — use an image screenshot instead (max 3 MB for PDFs).')
      if (statementFileInputRef.current) statementFileInputRef.current.value = ''
      return
    }
    setStatementLoading(true)
    setStatementData(null)
    setStatementError('')
    try {
      const result = await extractStatement(file)
      setStatementData(result)
    } catch (err) {
      setStatementError(err instanceof Error ? err.message : 'Extraction failed.')
    } finally {
      setStatementLoading(false)
      if (statementFileInputRef.current) statementFileInputRef.current.value = ''
    }
  }

  async function handleSaveStatement() {
    if (!statementData || !uid) return
    setStatementSaving(true)
    try {
      const expense: Expense = {
        id: generateId(),
        label: statementData.label,
        category: statementData.category,
        amount: statementData.amount,
        month: statementData.month,
        ...(statementData.dueDay != null ? { dueDay: statementData.dueDay } : {}),
        isRecurring: statementData.isRecurring,
        recurringSourceId: null,
      }
      await setDoc(doc(firestore, 'users', uid, 'expenses', expense.id), expense)
      setStatementData(null)
    } catch {
      setStatementError('Failed to save expense. Please try again.')
    } finally {
      setStatementSaving(false)
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
          {/* CSV Import */}
          <div>
            <input
              ref={csvFileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImportCsv}
            />
            <button
              onClick={() => csvFileInputRef.current?.click()}
              disabled={csvImporting}
              className="w-full py-3 border border-green-500 text-green-600 rounded-xl font-semibold disabled:opacity-50"
            >
              {csvImporting ? 'Importing...' : '📥 Import CSV'}
            </button>
            {csvImportMsg && (
              <p className={`text-sm mt-2 text-center ${csvImportMsg.startsWith('✓') ? 'text-green-500' : 'text-red-400'}`}>
                {csvImportMsg}
              </p>
            )}
            <div className="mt-2 p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 font-mono leading-relaxed whitespace-pre">
                {'Format:  Month,Label,Category,Amount,Recurring,DueDay\nExample: 2026-06,Netflix,Entertainment,15.99,true,5\n         2026-06,Rent,Other,2000.00,false,'}
              </p>
            </div>
          </div>
          {/* Statement Import — PDF or image screenshot */}
          <div>
            <input
              ref={statementFileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              className="hidden"
              onChange={handleImportStatement}
            />
            <button
              onClick={() => statementFileInputRef.current?.click()}
              disabled={statementLoading}
              className="w-full py-3 border border-purple-400 text-purple-600 rounded-xl font-semibold disabled:opacity-50"
            >
              {statementLoading ? 'Analysing...' : '🤖 Import Statement (PDF / Screenshot)'}
            </button>
            {statementError && (
              <p className="text-sm mt-2 text-center text-red-400">{statementError}</p>
            )}
          </div>

          {statementData && (
            <div className="border border-purple-200 rounded-xl p-4 space-y-3 bg-purple-50">
              <p className="text-sm font-semibold text-purple-700">Review before saving</p>
              <div className="text-sm space-y-1">
                {(
                  [
                    ['Label', statementData.label],
                    ['Amount', `$${statementData.amount.toFixed(2)}`],
                    ['Month', statementData.month],
                    ['Due Day', statementData.dueDay != null ? String(statementData.dueDay) : '—'],
                    ['Category', statementData.category],
                    ['Recurring', statementData.isRecurring ? 'Yes' : 'No'],
                  ] as [string, string][]
                ).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-medium text-gray-800">{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStatementData(null)}
                  className="flex-1 py-2 border border-gray-300 text-gray-500 rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveStatement}
                  disabled={statementSaving}
                  className="flex-1 py-2 bg-purple-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {statementSaving ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </div>
          )}

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
