import { useEffect, useState } from 'react'
import Dashboard from './components/Dashboard'
import FileScanner from './components/FileScanner'
import URLScanner from './components/URLScanner'
import EmailScanner from './components/EmailScanner'
import Assistant from './components/Assistant'
import AdminPanel from './components/AdminPanel'
import ThemeToggle from './components/ThemeToggle'

const tabs = ['Dashboard', 'File Scanner', 'URL Scanner', 'Email Detector', 'AI Assistant', 'Admin Panel', 'Auth Demo'] as const

type Tab = (typeof tabs)[number]

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [tab, setTab] = useState<Tab>('Dashboard')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">AI ThreatGuard</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">Security operations dashboard</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Monitor threats, review recommendations and stay on top of security posture.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
              {tabs.map(value => (
                <button
                  key={value}
                  onClick={() => setTab(value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${tab === value ? 'bg-slate-950 text-white dark:bg-slate-200 dark:text-slate-900' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'}`}
                >
                  {value}
                </button>
              ))}
            </div>
            <ThemeToggle theme={theme} onToggle={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))} />
          </div>
        </header>

        {tab === 'Dashboard' ? (
          <Dashboard theme={theme} />
        ) : tab === 'File Scanner' ? (
          <FileScanner />
        ) : tab === 'URL Scanner' ? (
          <URLScanner />
        ) : tab === 'Email Detector' ? (
          <EmailScanner />
        ) : tab === 'AI Assistant' ? (
          <Assistant />
        ) : tab === 'Admin Panel' ? (
          <AdminPanel />
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Auth Demo</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400">Authentication is available via backend endpoints. Use the backend auth module to register, login, verify email, and reset passwords.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Register/Login</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Use the backend /auth endpoints to manage users.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Email verification</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Verification links are printed to server logs in the current demo flow.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
