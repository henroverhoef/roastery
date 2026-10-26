import { Link } from 'react-router-dom'
import { useRoastNumbers, useStore } from '../data/store'
import { useLive } from '../lib/live'
import RoastCard from '../components/RoastCard'
import { daysBetween, todayLocal } from '../lib/format'
import { Empty } from '../components/ui'

export default function Home() {
  const { roasts, beans, tastings, settings, saveSettings, loaded } = useStore()
  const liveRoast = useLive()
  const numbers = useRoastNumbers()
  const beanById = new Map(beans.map((b) => [b.id, b]))
  const today = todayLocal()
  const untasted = roasts.filter((r) => !tastings.some((t) => t.roast_id === r.id) && daysBetween(r.roasted_at, today) <= 30).slice(0, 5)
  const recent = roasts.slice(0, 5)

  return (
    <div className="page space-y-5">
      <div className="flex items-center gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-11 w-11 rounded-xl" />
        <div>
          <h1 className="h1">Roastery</h1>
          <p className="muted">Gene Café CBR-101 roast log</p>
        </div>
      </div>

      {!settings.unitChosen && (
        <div className="card border-l-4 border-amber-500">
          <p className="font-semibold">Does your Gene show °C or °F?</p>
          <p className="muted mb-3">You’ll type in exactly what the display says. You can change this later in Settings.</p>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={() => saveSettings({ unit: 'C', unitChosen: true })}>°C</button>
            <button className="btn-secondary flex-1" onClick={() => saveSettings({ unit: 'F', unitChosen: true })}>°F</button>
          </div>
        </div>
      )}

      {liveRoast ? (
        <Link to="/roast/live" className="btn-primary w-full py-4 text-lg">🔥 Back to the roast in progress</Link>
      ) : (
        <Link to="/roast/new" className="btn-primary w-full py-4 text-lg">Start a roast</Link>
      )}

      {untasted.length > 0 && (
        <section>
          <h2 className="h2 mb-2">Waiting for a tasting</h2>
          <div className="space-y-2">
            {untasted.map((r) => {
              const days = daysBetween(r.roasted_at, today)
              return (
                <Link key={r.id} to={`/roasts/${r.id}/taste`} className="card flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">#{numbers.get(r.id)} {beanById.get(r.bean_id ?? '')?.name ?? 'No bean'}</div>
                    <div className="text-xs text-stone-500">
                      Roasted {days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`}
                      {days < 1 ? ' · rest 24–48 h before judging' : ''}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-amber-700 dark:text-amber-400">How was it? →</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="h2">Recent roasts</h2>
          {roasts.length > 5 && <Link to="/roasts" className="text-sm text-amber-700 dark:text-amber-400">All {roasts.length} →</Link>}
        </div>
        {recent.length ? (
          <div className="space-y-2">
            {recent.map((r) => (
              <RoastCard key={r.id} roast={r} bean={beanById.get(r.bean_id ?? '')} tastings={tastings.filter((t) => t.roast_id === r.id)} n={numbers.get(r.id)} unit={settings.unit} />
            ))}
          </div>
        ) : loaded ? (
          <Empty>
            <p className="mb-2">No roasts yet.</p>
            <p className="text-sm">Add your green beans under <Link className="underline" to="/beans/new">Beans</Link> first, so the app can give origin-specific advice. Then start a roast.</p>
          </Empty>
        ) : (
          <Empty>Loading…</Empty>
        )}
      </section>
    </div>
  )
}
