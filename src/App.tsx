import { useEffect, useRef, useState } from 'react'
import ledgrLogo from './assets/ledgrlogo.png'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  useLocation,
} from 'react-router-dom'
import { seedCategories } from './db/db'
import { useAuth } from './hooks/useAuth'
import { usePin } from './hooks/usePin'
import PINScreen from './components/PINScreen'
import LoginView from './views/LoginView'
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
    const el = pageRef.current
    if (!el) return
    import('animejs').then(({ animate }) => {
      if (!el) return
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
      <header className="flex items-center gap-2 px-4 py-2 border-b shrink-0">
        <img src={ledgrLogo} alt="Ledgr" className="h-8 w-auto" />
      </header>
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
  const { user, loading: authLoading } = useAuth()
  const { hasPin, isLoading: pinLoading, setPin, verifyPin } = usePin()
  const [unlocked, setUnlocked] = useState(false)
  const [settingPin, setSettingPin] = useState(false)

  // Reset lock state on user change (sign out / switch account)
  useEffect(() => {
    setUnlocked(false)
    setSettingPin(false)
  }, [user?.uid])

  // Seed built-in categories after login
  useEffect(() => {
    if (user) seedCategories(user.uid)
  }, [user?.uid])

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        Loading...
      </div>
    )
  }

  if (!user) {
    return <LoginView />
  }

  if (pinLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        Loading...
      </div>
    )
  }

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
            setSettingPin(false)
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

  if (hasPin && !unlocked) {
    return (
      <PINScreen
        mode="verify"
        onVerify={verifyPin}
        onSuccess={() => setUnlocked(true)}
      />
    )
  }

  return (
    <BrowserRouter>
      <MainShell />
    </BrowserRouter>
  )
}

export default function App() {
  return <AppContent />
}
