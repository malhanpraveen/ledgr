import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { hashPin } from '../utils/hash'

export function usePin() {
  // Wrap result so undefined strictly means "query not yet resolved"
  // (db.settings.get returns undefined for both loading AND no-record-found)
  const pinResult = useLiveQuery(async () => ({ setting: await db.settings.get('pinHash') }))
  const isLoading = pinResult === undefined
  const pinSetting = pinResult?.setting
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
