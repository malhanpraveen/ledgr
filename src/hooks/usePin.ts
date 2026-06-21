import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore'
import { firestore } from '../firebase'
import { useAuth } from './useAuth'
import { hashPin } from '../utils/hash'

export function usePin() {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const [pinHash, setPinHash] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (!uid) { setPinHash(null); return }
    return onSnapshot(doc(firestore, 'users', uid, 'settings', 'pinHash'), snap => {
      setPinHash(snap.exists() ? (snap.data().value as string) : null)
    })
  }, [uid])

  const isLoading = pinHash === undefined
  const hasPin = Boolean(pinHash)

  async function setPin(pin: string) {
    if (!uid) return
    const hash = await hashPin(pin)
    await setDoc(doc(firestore, 'users', uid, 'settings', 'pinHash'), { value: hash })
  }

  async function verifyPin(pin: string): Promise<boolean> {
    if (!pinHash) return false
    const hash = await hashPin(pin)
    return pinHash === hash
  }

  async function removePin() {
    if (!uid) return
    await deleteDoc(doc(firestore, 'users', uid, 'settings', 'pinHash'))
  }

  return { hasPin, isLoading, setPin, verifyPin, removePin }
}
