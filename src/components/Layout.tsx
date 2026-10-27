import { NavLink, Outlet } from 'react-router-dom'
import { useStore } from '../data/store'
import { useLive } from '../lib/live'
import { Link } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home', icon: '☕' },
  { to: '/roasts', label: 'Roasts', icon: '📈' },
  { to: '/beans', label: 'Beans', icon: '🫘' },
  { to: '/library', label: 'Library', icon: '🌍' },
  { to: '/guide', label: 'Guide', icon: '📖' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Layout() {
  const { online, pending, syncError } = useStore()
  const liveRoast = useLive()
  return (
    <div className="min-h-dvh" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {liveRoast && (
        <Link to="/roast/live" className="block bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-stone-950">
          🔥 Roast in progress: tap to go back to it
        </Link>
      )}
      {(!online || pending > 0 || syncError) && (
        <div role="status" className="bg-sky-800 px-4 py-1.5 text-center text-sm text-white">
          {syncError ? `⚠️ Couldn’t save: ${syncError}` : !online ? '📴 Offline. Changes are saved on this phone and will sync later.' : `⏳ Syncing ${pending} change${pending === 1 ? '' : 's'}…`}
        </div>
      )}
      <main>
        <Outlet />
      </main>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-stone-900/95"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="mx-auto flex max-w-2xl">
          {tabs.map((t) => (
            <li key={t.to} className="flex-1">
              <NavLink
                to={t.to}
                end={t.to === '/'}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center text-xs font-medium ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-stone-500 dark:text-stone-400'}`
                }
              >
                <span aria-hidden className="text-xl leading-none">{t.icon}</span>
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
