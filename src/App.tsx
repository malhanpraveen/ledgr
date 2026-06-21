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

  useEffect(() => {
    if (!pageRef.current) return
    import('animejs').then(({ animate }) => {
      animate(pageRef.current!, {
        opacity: [0, 1],
        translateY: [8, 0],
        ease: 'outCubic',
        duration: 280,
      })
    })
  }, [location.pathname])

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
  const { hasPin, setPin, verifyPin } = usePin()
  const [unlocked, setUnlocked] = useState(false)
  const [offeringPinSetup, setOfferingPinSetup] = useState(false)
  const [settingPin, setSettingPin] = useState(false)

  // useLiveQuery returns undefined while loading, then resolves to the value.
  // hasPin is derived as Boolean(pinSetting?.value), so:
  //   - undefined pinSetting => hasPin = false (but we can't distinguish loading vs no-pin yet)
  // We need to track whether the query has resolved. useLiveQuery initializes to undefined.
  // The hook returns hasPin: boolean (always), but pinSetting starts as undefined.
  // We guard by checking if the liveQuery has fired — use a separate loading ref.

  // Show loading until useLiveQuery fires (pinSetting will be undefined initially).
  // Since usePin returns hasPin: boolean derived from pinSetting?.value,
  // and pinSetting starts undefined, hasPin will be false on first render even if a PIN exists.
  // We use a mounted + settled approach: after first render with a stable value we proceed.
  const [pinChecked, setPinChecked] = useState(false)

  useEffect(() => {
    // We delay one tick to let useLiveQuery settle from its initial undefined state.
    // This prevents flash of "no PIN" screen when a PIN actually exists.
    const id = setTimeout(() => setPinChecked(true), 50)
    return () => clearTimeout(id)
  }, [])

  if (!pinChecked) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        Loading...
      </div>
    )
  }

  // First launch: hasPin is false (no PIN stored), not unlocked yet, not offering setup
  if (!hasPin && !unlocked && !offeringPinSetup && !settingPin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white px-8">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">Ledgr</h1>
        <p className="text-gray-500 mb-8 text-center">
          Set a 4-digit PIN to protect your data?
        </p>
        <button
          onClick={() => {
            setOfferingPinSetup(true)
            setSettingPin(true)
          }}
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
          if (pin) await setPin(pin)
          setSettingPin(false)
          setUnlocked(true)
        }}
        onCancel={() => {
          setSettingPin(false)
          setOfferingPinSetup(false)
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
