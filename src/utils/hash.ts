export async function hashPin(pin: string): Promise<string> {
  // crypto.subtle requires HTTPS or localhost — fall back to simple hash on HTTP
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(pin)
    const buf = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  }
  // djb2 fallback (personal device only — not cryptographically strong)
  let h = 5381
  for (let i = 0; i < pin.length; i++) {
    h = Math.imul(h, 33) ^ pin.charCodeAt(i)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}
