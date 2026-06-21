import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { hashPin } from '../utils/hash'

export function usePin() {
  const pinSetting = useLiveQuery(() => db.settings.get('pinHash'))
  const hasPin = Boolean(pinSetting?.value)

  async function setPin(pin: string) {
    const hash = await hashPin(pin)
    await db.settings.put({ key: 'pinHash', value: hash })
  }

  async function verifyPin(pin: string): Promise<boolean> {
    const hash = await hashPin(pin)
    const stored = await db.settings.get('pinHash')
    return stored?.value === hash
  }

  async function removePin() {
    await db.settings.delete('pinHash')
  }

  return { hasPin, setPin, verifyPin, removePin }
}
