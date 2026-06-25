# CSV & Statement Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CSV import (with DueDay added to export), and PDF/image statement import via Gemini AI through a Vercel serverless function, all wired into SettingsView with a pre-save review card.

**Architecture:** CSV import is a pure client-side parser utility that validates rows and batch-writes to Firestore. Statement import (PDF/image) encodes the file as base64 JSON and POSTs it to a Vercel serverless function (`api/extract-statement.ts`) that calls Gemini with a structured output schema, returning one expense record that the user reviews before saving.

**Tech Stack:** React 19, TypeScript, Vitest, Firebase Firestore, `@google/genai` (npm), Vercel serverless functions (`@vercel/node` types)

## Global Constraints

- Test runner: `vitest` — run with `npm test`
- Tailwind only for styling — follow existing `rounded-xl`, `py-3`, `border`, `w-full` patterns in `SettingsView.tsx`
- Firestore collection path for expenses: `users/{uid}/expenses`
- Firestore collection path for categories: `users/{uid}/categories`
- Gemini model: `gemini-2.0-flash-latest`
- Env var for API key: `GEMINI_API_KEY` — server-side Vercel function only, never in client bundle
- `.env` must be gitignored; only `.env.example` is committed
- Vercel `api/` functions take routing precedence over the SPA rewrite in `vercel.json` — no changes to `vercel.json` needed

---

### Task 1: Update export CSV to include DueDay column

**Files:**
- Modify: `src/utils/exportCsv.ts`
- Modify: `src/test/exportCsv.test.ts`

**Interfaces:**
- Produces: `buildCsvString(expenses: Expense[]): string` — header is now `Month,Label,Category,Amount,Recurring,DueDay`; each row ends with `,{dueDay}` or `,` when `dueDay` is undefined

- [ ] **Step 1: Update tests to expect new format**

Replace the full content of `src/test/exportCsv.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildCsvString } from '../utils/exportCsv'
import type { Expense } from '../types'

const SAMPLE: Expense[] = [
  {
    id: 'abc',
    label: 'Chase Sapphire',
    category: 'Credit Card',
    amount: 450,
    month: '2026-06',
    dueDay: 15,
    isRecurring: true,
    recurringSourceId: null,
  },
  {
    id: 'def',
    label: 'Tesla Loan',
    category: 'Car',
    amount: 650.5,
    month: '2026-06',
    isRecurring: false,
    recurringSourceId: null,
  },
]

describe('buildCsvString', () => {
  it('starts with correct header including DueDay', () => {
    const csv = buildCsvString(SAMPLE)
    expect(csv.split('\n')[0]).toBe('Month,Label,Category,Amount,Recurring,DueDay')
  })

  it('formats amount to 2 decimal places', () => {
    const csv = buildCsvString(SAMPLE)
    expect(csv).toContain('650.50')
  })

  it('wraps label with commas in quotes', () => {
    const withComma: Expense[] = [{ ...SAMPLE[0], label: 'Chase, Sapphire' }]
    const csv = buildCsvString(withComma)
    expect(csv).toContain('"Chase, Sapphire"')
  })

  it('includes dueDay when set', () => {
    const csv = buildCsvString(SAMPLE)
    expect(csv.split('\n')[1]).toMatch(/,15$/)
  })

  it('leaves dueDay empty when undefined', () => {
    const csv = buildCsvString(SAMPLE)
    expect(csv.split('\n')[2]).toMatch(/,false,$/)
  })

  it('produces correct row count (header + 2 rows)', () => {
    const csv = buildCsvString(SAMPLE)
    expect(csv.split('\n')).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npm test -- --reporter=verbose src/test/exportCsv.test.ts
```

Expected: at least 2 FAIL (header test, dueDay tests)

- [ ] **Step 3: Update `buildCsvString` in `src/utils/exportCsv.ts`**

Change only the `buildCsvString` function — leave `csvField` and `shareCsv` unchanged:

```typescript
export function buildCsvString(expenses: Expense[]): string {
  const header = 'Month,Label,Category,Amount,Recurring,DueDay'
  const rows = expenses.map(e => {
    return `${e.month},${csvField(e.label)},${csvField(e.category)},${e.amount.toFixed(2)},${e.isRecurring},${e.dueDay ?? ''}`
  })
  return [header, ...rows].join('\n')
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
npm test -- --reporter=verbose src/test/exportCsv.test.ts
```

Expected: 6 PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/exportCsv.ts src/test/exportCsv.test.ts
git commit -m "feat: add DueDay column to CSV export"
```

---

### Task 2: Implement CSV parser utility

**Files:**
- Create: `src/utils/importCsv.ts`
- Create: `src/test/importCsv.test.ts`

**Interfaces:**
- Consumes: `Expense` type from `../types`
- Produces:
  ```typescript
  interface ParseCsvResult {
    expenses: Omit<Expense, 'id' | 'recurringSourceId'>[]
    newCategories: string[]   // unknown category names, caller creates them
    errors: string[]          // row-level messages for skipped rows
  }
  parseCsv(csv: string, existingCategories: Set<string>): ParseCsvResult
  ```

- [ ] **Step 1: Write failing tests — create `src/test/importCsv.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { parseCsv } from '../utils/importCsv'

const EXISTING = new Set(['Credit Card', 'Car', 'Other', 'Utilities'])

const VALID_CSV = `Month,Label,Category,Amount,Recurring,DueDay
2026-06,Netflix,Entertainment,15.99,true,5
2026-06,Rent,Other,2000.00,false,`

describe('parseCsv', () => {
  it('skips header row', () => {
    const { expenses } = parseCsv(VALID_CSV, EXISTING)
    expect(expenses).toHaveLength(2)
  })

  it('parses label, category, amount, month', () => {
    const { expenses } = parseCsv(VALID_CSV, EXISTING)
    expect(expenses[0]).toMatchObject({
      label: 'Netflix',
      category: 'Entertainment',
      amount: 15.99,
      month: '2026-06',
    })
  })

  it('parses isRecurring true/false', () => {
    const { expenses } = parseCsv(VALID_CSV, EXISTING)
    expect(expenses[0].isRecurring).toBe(true)
    expect(expenses[1].isRecurring).toBe(false)
  })

  it('parses dueDay when present', () => {
    const { expenses } = parseCsv(VALID_CSV, EXISTING)
    expect(expenses[0].dueDay).toBe(5)
  })

  it('sets dueDay undefined when column is empty', () => {
    const { expenses } = parseCsv(VALID_CSV, EXISTING)
    expect(expenses[1].dueDay).toBeUndefined()
  })

  it('flags unknown categories in newCategories', () => {
    const { newCategories } = parseCsv(VALID_CSV, EXISTING)
    expect(newCategories).toContain('Entertainment')
  })

  it('does not flag known categories', () => {
    const { newCategories } = parseCsv(VALID_CSV, EXISTING)
    expect(newCategories).not.toContain('Other')
  })

  it('deduplicates newCategories across rows', () => {
    const csv = `Month,Label,Category,Amount,Recurring,DueDay
2026-06,A,NewCat,10,false,
2026-06,B,NewCat,20,false,`
    const { newCategories } = parseCsv(csv, EXISTING)
    expect(newCategories.filter(c => c === 'NewCat')).toHaveLength(1)
  })

  it('skips row with invalid month format', () => {
    const csv = `Month,Label,Category,Amount,Recurring,DueDay\n06-2026,Bad,Other,10,false,`
    const { expenses, errors } = parseCsv(csv, EXISTING)
    expect(expenses).toHaveLength(0)
    expect(errors[0]).toContain('invalid month')
  })

  it('skips row with non-numeric amount', () => {
    const csv = `Month,Label,Category,Amount,Recurring,DueDay\n2026-06,Bad,Other,abc,false,`
    const { expenses, errors } = parseCsv(csv, EXISTING)
    expect(expenses).toHaveLength(0)
    expect(errors[0]).toContain('invalid amount')
  })

  it('skips row with missing label', () => {
    const csv = `Month,Label,Category,Amount,Recurring,DueDay\n2026-06,,Other,10,false,`
    const { expenses, errors } = parseCsv(csv, EXISTING)
    expect(expenses).toHaveLength(0)
    expect(errors[0]).toContain('missing label')
  })

  it('handles quoted fields containing commas', () => {
    const csv = `Month,Label,Category,Amount,Recurring,DueDay\n2026-06,"Chase, Sapphire",Credit Card,450,true,15`
    const { expenses } = parseCsv(csv, EXISTING)
    expect(expenses[0].label).toBe('Chase, Sapphire')
  })

  it('skips blank lines between rows', () => {
    const csv = `Month,Label,Category,Amount,Recurring,DueDay\n\n2026-06,Netflix,Other,15.99,false,\n`
    const { expenses } = parseCsv(csv, EXISTING)
    expect(expenses).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests — expect all to fail**

```bash
npm test -- --reporter=verbose src/test/importCsv.test.ts
```

Expected: FAIL with "Cannot find module '../utils/importCsv'"

- [ ] **Step 3: Create `src/utils/importCsv.ts`**

```typescript
import type { Expense } from '../types'

export interface ParseCsvResult {
  expenses: Omit<Expense, 'id' | 'recurringSourceId'>[]
  newCategories: string[]
  errors: string[]
}

export function parseCsv(csv: string, existingCategories: Set<string>): ParseCsvResult {
  const lines = csv.split('\n').map(l => l.trim()).filter(Boolean)
  const expenses: Omit<Expense, 'id' | 'recurringSourceId'>[] = []
  const newCategories: string[] = []
  const newCategorySet = new Set<string>()
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    if (cols.length < 5) {
      errors.push(`Row ${i + 1}: insufficient columns`)
      continue
    }
    const [month, label, category, amountStr, recurringStr, dueDayStr] = cols

    if (!/^\d{4}-\d{2}$/.test(month.trim())) {
      errors.push(`Row ${i + 1}: invalid month "${month}"`)
      continue
    }
    if (!label.trim()) {
      errors.push(`Row ${i + 1}: missing label`)
      continue
    }
    const amount = parseFloat(amountStr)
    if (isNaN(amount)) {
      errors.push(`Row ${i + 1}: invalid amount "${amountStr}"`)
      continue
    }

    const cat = category.trim() || 'Other'
    if (!existingCategories.has(cat) && !newCategorySet.has(cat)) {
      newCategories.push(cat)
      newCategorySet.add(cat)
    }

    const parsedDueDay = dueDayStr?.trim() ? parseInt(dueDayStr.trim(), 10) : NaN
    const dueDay = !isNaN(parsedDueDay) ? parsedDueDay : undefined

    expenses.push({
      label: label.trim(),
      category: cat,
      amount,
      month: month.trim(),
      isRecurring: recurringStr?.trim().toLowerCase() === 'true',
      ...(dueDay !== undefined ? { dueDay } : {}),
    })
  }

  return { expenses, newCategories, errors }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current)
  return result
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
npm test -- --reporter=verbose src/test/importCsv.test.ts
```

Expected: 13 PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/importCsv.ts src/test/importCsv.test.ts
git commit -m "feat: add CSV parser with validation and auto-category detection"
```

---

### Task 3: Wire CSV import + help text into SettingsView

**Files:**
- Modify: `src/views/SettingsView.tsx`

**Interfaces:**
- Consumes: `parseCsv` from `../utils/importCsv`, `generateId` from `../utils/uuid`
- `categories` from `useCategories()` is already in scope — provides the existing category name set

- [ ] **Step 1: Add imports**

In `src/views/SettingsView.tsx`, update the existing firestore import to add `setDoc`:
```typescript
import { collection, getDocs, doc, writeBatch, setDoc } from 'firebase/firestore'
```

Add two new imports after the existing import block:
```typescript
import { parseCsv } from '../utils/importCsv'
import { generateId } from '../utils/uuid'
import type { Expense } from '../types'
```

- [ ] **Step 2: Add state and ref**

Inside the component function, after the existing `const fileInputRef = useRef<HTMLInputElement>(null)` line, add:
```typescript
const csvFileInputRef = useRef<HTMLInputElement>(null)
const [csvImporting, setCsvImporting] = useState(false)
const [csvImportMsg, setCsvImportMsg] = useState('')
```

- [ ] **Step 3: Add `handleImportCsv` handler**

Add after the existing `handleImportJson` function:
```typescript
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
```

- [ ] **Step 4: Add CSV import UI inside the Data section**

In the JSX, inside the `<section>` Data `<div className="space-y-3">`, after the existing `📥 Import Backup (JSON)` block and before the `📤 Share CSV` button, add:

```tsx
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
```

- [ ] **Step 5: Manual test**

```bash
npm run dev
```

Create a test file named `test.csv`:
```
Month,Label,Category,Amount,Recurring,DueDay
2026-06,Test Expense,Other,99.99,false,
2026-06,Netflix,Entertainment,15.99,true,5
```

1. Navigate to Settings → Data section
2. Click "Import CSV", select `test.csv`
3. Verify message: `✓ Imported 2 expenses (1 new category created).`
4. Navigate to Jun 2026 month view — confirm both expenses appear

- [ ] **Step 6: Commit**

```bash
git add src/views/SettingsView.tsx
git commit -m "feat: wire CSV import with help text into settings"
```

---

### Task 4: Environment and dependency setup for Gemini

**Files:**
- Modify: `.gitignore` — add `.env`
- Create: `.env.example`
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Add `.env` to `.gitignore`**

Append this line to `.gitignore`:
```
.env
```

- [ ] **Step 2: Create `.env.example`** (committed to repo)

```
GEMINI_API_KEY=your_gemini_api_key_here
```

- [ ] **Step 3: Create local `.env`** (not committed)

Create `.env` in the project root:
```
GEMINI_API_KEY=<your key from aistudio.google.com/apikey>
```

- [ ] **Step 4: Install dependencies**

```bash
npm install @google/genai
npm install -D @vercel/node
```

- [ ] **Step 5: Verify packages are listed in package.json**

```bash
grep -E '"@google/genai"|"@vercel/node"' package.json
```

Expected:
```
"@google/genai": "...",
"@vercel/node": "...",
```

- [ ] **Step 6: Commit**

```bash
git add .gitignore .env.example package.json package-lock.json
git commit -m "chore: install @google/genai and configure env for statement extraction"
```

---

### Task 5: Vercel serverless function for Gemini extraction

**Files:**
- Create: `api/extract-statement.ts`

**Interfaces:**
- Request: `POST /api/extract-statement`, `Content-Type: application/json`, body `{ mimeType: string, data: string }` where `data` is base64-encoded file bytes
- Response 200: `{ label: string, amount: number, month: string, dueDay: number | null, isRecurring: boolean, category: string }`
- Response 400: `{ error: string }` — unsupported type or missing fields
- Response 500: `{ error: string }` — Gemini API failure or missing env var

Note: Vercel auto-discovers `api/` directory as serverless functions. The existing SPA rewrite in `vercel.json` does not interfere — Vercel evaluates function routes before rewrites.

- [ ] **Step 1: Create `api/extract-statement.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GoogleGenAI } from '@google/genai'

const SUPPORTED_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
])

const SCHEMA = {
  type: 'object',
  properties: {
    label: {
      type: 'string',
      description: 'Brief name for this bill, e.g. "Chase Sapphire Statement" or "Home Mortgage"',
    },
    amount: {
      type: 'number',
      description: 'Total amount due (not minimum payment)',
    },
    month: {
      type: 'string',
      description: 'Billing or statement month in YYYY-MM format',
    },
    dueDay: {
      type: ['integer', 'null'],
      description: 'Day of month payment is due (1–31). Null if not found in document.',
      minimum: 1,
      maximum: 31,
    },
    isRecurring: {
      type: 'boolean',
      description: 'True if this is a regular monthly bill',
    },
    category: {
      type: 'string',
      enum: ['Credit Card', 'Mortgage', 'Car', 'Other'],
      description: 'Category based on statement type',
    },
  },
  required: ['label', 'amount', 'month', 'dueDay', 'isRecurring', 'category'],
}

const PROMPT =
  'Extract billing details from this financial statement or screenshot. ' +
  'For category choose one of: Credit Card, Mortgage, Car, Other. ' +
  'Set isRecurring to true for regular monthly bills. ' +
  'Return total amount due, not minimum payment.'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
  }

  const { mimeType, data } = req.body as { mimeType?: string; data?: string }
  if (!mimeType || !data) {
    return res.status(400).json({ error: 'Missing mimeType or data' })
  }
  if (!SUPPORTED_TYPES.has(mimeType)) {
    return res.status(400).json({ error: `Unsupported file type: ${mimeType}` })
  }

  const ai = new GoogleGenAI({ apiKey })

  const generateConfig = {
    responseMimeType: 'application/json',
    responseSchema: SCHEMA,
    temperature: 0.1,
  }

  try {
    if (mimeType === 'application/pdf') {
      const buffer = Buffer.from(data, 'base64')
      const blob = new Blob([buffer], { type: 'application/pdf' })
      const uploaded = await ai.files.upload({
        file: blob,
        config: { mimeType: 'application/pdf' },
      })

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-latest',
        contents: [
          {
            parts: [
              { fileData: { fileUri: uploaded.uri, mimeType: 'application/pdf' } },
              { text: PROMPT },
            ],
          },
        ],
        config: generateConfig,
      })

      await ai.files.delete({ name: uploaded.name! })

      return res.status(200).json(JSON.parse(response.text ?? '{}'))
    } else {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-latest',
        contents: [
          {
            parts: [
              { inlineData: { mimeType, data } },
              { text: PROMPT },
            ],
          },
        ],
        config: generateConfig,
      })

      return res.status(200).json(JSON.parse(response.text ?? '{}'))
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Extraction failed'
    return res.status(500).json({ error: msg })
  }
}
```

- [ ] **Step 2: Install Vercel CLI if needed**

```bash
npx vercel --version 2>/dev/null || npm install -g vercel
```

- [ ] **Step 3: Test locally with `vercel dev`**

In one terminal:
```bash
npx vercel dev --listen 3001
```

In a second terminal, test with a real image (take a screenshot of any bill, save as `test.png`):
```bash
node -e "
const fs = require('fs');
const data = fs.readFileSync('test.png').toString('base64');
const payload = JSON.stringify({ mimeType: 'image/png', data });
require('https').request || require('http').request;
fetch('http://localhost:3001/api/extract-statement', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: payload
}).then(r => r.json()).then(console.log).catch(console.error);
"
```

Expected: `{ label: '...', amount: ..., month: '2026-XX', dueDay: ..., isRecurring: ..., category: '...' }`

- [ ] **Step 4: Commit**

```bash
git add api/extract-statement.ts
git commit -m "feat: add Vercel function for Gemini PDF/image statement extraction"
```

---

### Task 6: Client util + statement review card in SettingsView

**Files:**
- Create: `src/utils/importStatement.ts`
- Modify: `src/views/SettingsView.tsx`

**Interfaces:**
- Consumes: `POST /api/extract-statement` from Task 5
- Produces:
  ```typescript
  interface StatementData {
    label: string
    amount: number
    month: string            // "YYYY-MM"
    dueDay: number | null
    isRecurring: boolean
    category: string
  }
  extractStatement(file: File): Promise<StatementData>
  ```

- [ ] **Step 1: Create `src/utils/importStatement.ts`**

```typescript
export interface StatementData {
  label: string
  amount: number
  month: string
  dueDay: number | null
  isRecurring: boolean
  category: string
}

export async function extractStatement(file: File): Promise<StatementData> {
  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const data = btoa(binary)

  const res = await fetch('/api/extract-statement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mimeType: file.type, data }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error((err as { error?: string }).error ?? 'Extraction failed')
  }

  return res.json() as Promise<StatementData>
}
```

- [ ] **Step 2: Add imports to `src/views/SettingsView.tsx`**

Add after the existing import block:
```typescript
import { extractStatement } from '../utils/importStatement'
import type { StatementData } from '../utils/importStatement'
```

- [ ] **Step 3: Add state and ref for statement import**

Inside the component, after the `csvImportMsg` state line, add:
```typescript
const statementFileInputRef = useRef<HTMLInputElement>(null)
const [statementLoading, setStatementLoading] = useState(false)
const [statementData, setStatementData] = useState<StatementData | null>(null)
const [statementError, setStatementError] = useState('')
const [statementSaving, setStatementSaving] = useState(false)
```

- [ ] **Step 4: Add handlers**

After `handleImportCsv`, add:
```typescript
async function handleImportStatement(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return
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
  } finally {
    setStatementSaving(false)
  }
}
```

- [ ] **Step 5: Add statement import UI + review card**

In the Data section JSX, after the CSV import block (and before the `📤 Share CSV` button), add:

```tsx
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
```

- [ ] **Step 6: Run full test suite**

```bash
npm test
```

Expected: all existing tests PASS (statement util has no unit tests — it wraps a network call)

- [ ] **Step 7: End-to-end manual test**

```bash
npx vercel dev --listen 3001
```

Navigate to `http://localhost:3001` → Settings:

1. Click "Import Statement (PDF / Screenshot)"
2. Select a credit card statement PDF or a screenshot of a bill
3. Verify review card appears with extracted label, amount, month, category
4. Click "Save Expense"
5. Navigate to the correct month — confirm the expense exists

- [ ] **Step 8: Commit**

```bash
git add src/utils/importStatement.ts src/views/SettingsView.tsx
git commit -m "feat: add statement import (PDF/screenshot) with Gemini review card"
```
