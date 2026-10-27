import { Link, NavLink, Outlet } from 'react-router-dom'

/** Frame for the pages anyone can open without signing in. */
export default function PublicShell() {
  const tab = ({ isActive }: { isActive: boolean }) => `rounded-lg px-3 py-1.5 text-sm font-semibold ${isActive ? 'bg-stone-200 dark:bg-stone-800' : 'text-stone-600 dark:text-stone-400'}`
  return (
    <div className="min-h-dvh" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-stone-900/95">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2">
          <img src="/icons/icon-192.png" alt="" className="h-8 w-8 rounded-lg" />
          <span className="font-bold">Roastery</span>
          <nav className="ml-2 flex gap-1" aria-label="Main">
            <NavLink to="/library" className={tab}>Library</NavLink>
            <NavLink to="/guide" className={tab}>Guide</NavLink>
          </nav>
          <Link to="/" className="btn-primary ml-auto px-3 py-1.5 text-sm">Sign in</Link>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
