import { useEffect, useRef, useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  useLocation,
} from 'react-router-dom'
import { seedCategories } from './db/db'
import { usePin } from './hooks/usePin'
import PINScreen from './components/PINScreen'
import MonthView from './views/MonthView'
import HistoryView from './views/HistoryView'
import AnalyticsView from './views/AnalyticsView'
import SettingsView from './views/SettingsView'

const TABS = [
  { to: '/month', label: 'Month', icon: '📅' },
  { to: '/history', label: 'History', icon: '🗓️' },
  { to: '/analytics', label: 'Analytics', icon: '📊' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

function MainShell() {
  const location = useLocation()
  const pageRef = useRef<HTMLElement>(null)
  const pathname = location.pathname

  useEffect(() => {
    const el = pageRef.current   // capture synchronously before async gap
    if (!el) return
    import('animejs').then(({ animate }) => {
      if (!el) return              // check again inside .then() (el is from closure)
      animate(el, {
        opacity: [0, 1],
        translateY: [8, 0],
        ease: 'outCubic',
        duration: 280,
      })
    })
  }, [pathname])

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white">
      <main ref={pageRef} className="flex-1 overflow-y-auto pb-16">
        <Routes>
          <Route path="/" element={<Navigate to="/month" replace />} />
          <Route path="/month" element={<MonthView />} />
          <Route path="/history" element={<HistoryView />} />
          <Route path="/analytics" element={<AnalyticsView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
      </main>
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto border-t bg-white flex">
        {TABS.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs ${
                isActive ? 'text-blue-500' : 'text-gray-400'
              }`
            }
          >
            <span className="text-xl">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function AppContent() {
  const { hasPin, isLoading, setPin, verifyPin } = usePin()
  const [unlocked, setUnlocked] = useState(false)
  const [settingPin, setSettingPin] = useState(false)

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        Loading...
      </div>
    )
  }

  // First launch: no PIN stored, not yet unlocked, not actively setting a PIN
  if (!hasPin && !unlocked && !settingPin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white px-8">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">Ledgr</h1>
        <p className="text-gray-500 mb-8 text-center">
          Set a 4-digit PIN to protect your data?
        </p>
        <button
          onClick={() => setSettingPin(true)}
          className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold mb-3"
        >
          Set PIN
        </button>
        <button
          onClick={() => setUnlocked(true)}
          className="text-gray-400 text-sm"
        >
          Skip
        </button>
      </div>
    )
  }

  // PIN setup screen
  if (!hasPin && settingPin) {
    return (
      <PINScreen
        mode="set"
        onSuccess={async (pin) => {
          if (!pin) return
          try {
            await setPin(pin)
            setUnlocked(true)
          } catch {
            // IndexedDB write failed — unlock without PIN rather than leaving user stuck
            setUnlocked(true)
          }
        }}
        onCancel={() => {
          setSettingPin(false)
          setUnlocked(true)
        }}
      />
    )
  }

  // PIN verify screen
  if (hasPin && !unlocked) {
    return (
      <PINScreen
        mode="verify"
        onVerify={verifyPin}
        onSuccess={() => setUnlocked(true)}
      />
    )
  }

  // Main app
  return (
    <BrowserRouter>
      <MainShell />
    </BrowserRouter>
  )
}

export default function App() {
  const [dbReady, setDbReady] = useState(false)

  useEffect(() => {
    seedCategories().then(() => setDbReady(true))
  }, [])

  if (!dbReady) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        Loading...
      </div>
    )
  }

  return <AppContent />
}
