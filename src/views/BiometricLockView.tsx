import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useBiometric } from '../hooks/useBiometric'

interface Props {
  onUnlock: () => void
}

export default function BiometricLockView({ onUnlock }: Props) {
  const { user, logout } = useAuth()
  const { authenticate, unregister } = useBiometric(user?.uid)
  const [loading, setLoading] = useState(false)
  const [failCount, setFailCount] = useState(0)

  async function tryAuth() {
    setLoading(true)
    const ok = await authenticate()
    setLoading(false)
    if (ok) {
      onUnlock()
    } else {
      setFailCount(f => f + 1)
    }
  }

  function resetAndUnlock() {
    unregister()
    onUnlock()
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white px-8">
      <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-6">
        <svg viewBox="0 0 24 24" className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="3"/>
          <path d="M5 20a7 7 0 0114 0"/>
          <path d="M9 8.5c0 .8.4 1.5 1 2"/>
          <path d="M15 8.5c0 .8-.4 1.5-1 2"/>
        </svg>
      </div>

      <h1 className="text-xl font-bold text-gray-800 mb-1">Ledgr</h1>
      <p className="text-sm text-gray-400 mb-10">Unlock with Face ID</p>

      {failCount > 0 && (
        <p className="text-sm text-red-400 mb-4">Face ID failed — try again</p>
      )}

      <button
        onClick={tryAuth}
        disabled={loading}
        className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold mb-4 disabled:opacity-40"
      >
        {loading ? 'Waiting for Face ID…' : 'Use Face ID'}
      </button>

      {failCount >= 2 && (
        <button
          onClick={resetAndUnlock}
          className="w-full py-3 border border-orange-300 text-orange-400 rounded-xl font-semibold mb-4"
        >
          Disable Face ID &amp; Enter
        </button>
      )}

      <button onClick={logout} className="text-sm text-gray-400">
        Sign out
      </button>
    </div>
  )
}
