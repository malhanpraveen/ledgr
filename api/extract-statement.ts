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
      enum: ['Credit Card', 'Mortgage', 'Car', 'Utilities', 'Other'],
      description: 'Category based on statement type',
    },
  },
  required: ['label', 'amount', 'month', 'dueDay', 'isRecurring', 'category'],
}

const PROMPT =
  'Extract billing details from this financial statement or screenshot. ' +
  'For category choose one of: Credit Card, Mortgage, Car, Utilities, Other. ' +
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

      let pdfResult: unknown
      try {
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
        if (!response.text) throw new Error('No content returned from model')
        pdfResult = JSON.parse(response.text)
      } finally {
        await ai.files.delete({ name: uploaded.name! }).catch(() => {/* ignore delete errors */})
      }
      // Validate month format
      const parsedPdf = pdfResult as { month?: string }
      if (!parsedPdf.month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(parsedPdf.month)) {
        return res.status(500).json({ error: 'Could not extract a valid billing month from this document.' })
      }
      return res.status(200).json(pdfResult)
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

      if (!response.text) throw new Error('No content returned from model')
      const result = JSON.parse(response.text)
      // Validate month format
      const parsed = result as { month?: string }
      if (!parsed.month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(parsed.month)) {
        return res.status(500).json({ error: 'Could not extract a valid billing month from this document.' })
      }
      return res.status(200).json(result)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Extraction failed'
    return res.status(500).json({ error: msg })
  }
}
