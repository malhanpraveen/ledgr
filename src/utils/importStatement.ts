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
