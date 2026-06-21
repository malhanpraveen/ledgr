import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { hashPin } from '../utils/hash'

export function usePin() {
  const pinSetting = useLiveQuery(() => db.settings.get('pinHash'))
  const isLoading = pinSetting === undefined   // undefined = query not yet resolved
  const hasPin = Boolean(pinSetting?.value)

  async function setPin(pin: string) {
    const hash = await hashPin(pin)
    await db.settings.put({ key: 'pinHash', value: hash })
  }

  async function verifyPin(pin: string): Promise<boolean> {
    if (!pinSetting?.value) return false
    const hash = await hashPin(pin)
    return pinSetting.value === hash
  }

  async function removePin() {
    await db.settings.delete('pinHash')
  }

  return { hasPin, isLoading, setPin, verifyPin, removePin }
}
