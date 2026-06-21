import { describe, it, expect } from 'vitest'
import { hashPin } from '../utils/hash'

describe('hashPin', () => {
  it('returns a 64-char hex string', async () => {
    const hash = await hashPin('1234')
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]+$/)
  })

  it('same pin produces same hash', async () => {
    const a = await hashPin('5678')
    const b = await hashPin('5678')
    expect(a).toBe(b)
  })

  it('different pins produce different hashes', async () => {
    const a = await hashPin('1111')
    const b = await hashPin('2222')
    expect(a).not.toBe(b)
  })
})
