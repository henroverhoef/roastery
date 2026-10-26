import { Link } from 'react-router-dom'
import { useStore } from '../data/store'
import { Empty, Header } from '../components/ui'
import { findOrigin } from '../knowledge/origins'
import { findProcess } from '../knowledge/processes'

export default function Beans() {
  const { beans, roasts, tastings } = useStore()
  const sorted = [...beans].sort((a, b) => Number(a.archived) - Number(b.archived) || a.name.localeCompare(b.name))
  return (
    <div className="page">
      <Header title="Beans" action={<Link to="/beans/new" className="btn-primary">+ Bean</Link>} />
      {sorted.length ? (
        <div className="space-y-2">
          {sorted.map((b) => {
            const rs = roasts.filter((r) => r.bean_id === b.id)
            const ratings = tastings.filter((t) => rs.some((r) => r.id === t.roast_id)).map((t) => t.rating ?? 0)
            const best = ratings.length ? Math.max(...ratings) : 0
            return (
              <Link key={b.id} to={`/beans/${b.id}`} className={`card block ${b.archived ? 'opacity-60' : ''}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold">{b.name}</span>
                  <span className="shrink-0 text-amber-500">{best ? '★'.repeat(best) : ''}</span>
                </div>
                <div className="text-sm text-stone-500">
                  {[findOrigin(b.country)?.name ?? b.country, b.region, findProcess(b.process)?.name].filter(Boolean).join(' · ')}
                  {(b.altitude_min || b.altitude_max) && ` · ${[b.altitude_min, b.altitude_max].filter(Boolean).join('–')} m`}
                  {` · ${rs.length} roast${rs.length === 1 ? '' : 's'}`}
                  {b.archived ? ' · finished' : ''}
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <Empty>
          <p className="mb-2">No beans yet.</p>
          <p className="text-sm">Add each green coffee you buy: origin, region, altitude, process and the seller’s notes. The app uses them for roasting advice.</p>
        </Empty>
      )}
    </div>
  )
}
