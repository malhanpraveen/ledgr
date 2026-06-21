import { useEffect, useRef } from 'react'
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
      <header className="flex items-center gap-2.5 px-4 py-3 border-b shrink-0">
        <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
          <svg viewBox="0 0 20 20" className="w-4 h-4 text-white fill-current">
            <rect x="3" y="4" width="14" height="2" rx="1"/>
            <rect x="3" y="9" width="10" height="2" rx="1"/>
            <rect x="3" y="14" width="12" height="2" rx="1"/>
          </svg>
        </div>
        <span className="font-bold text-base tracking-tight text-gray-800">Ledgr</span>
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

  return (
    <BrowserRouter>
      <MainShell />
    </BrowserRouter>
  )
}

export default function App() {
  return <AppContent />
}
