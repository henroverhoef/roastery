import { Link } from 'react-router-dom'
import type { Bean, Roast, Tasting, Unit } from '../lib/types'
import { computeMetrics } from '../lib/metrics'
import { fmtDate, fmtPct, fmtTime } from '../lib/format'
import { findOrigin } from '../knowledge/origins'
import { findLevel } from '../knowledge/roasting'
import { findFlavour } from '../knowledge/flavours'

export default function RoastCard({ roast, bean, tastings, n }: { roast: Roast; bean?: Bean; tastings: Tasting[]; n?: number; unit: Unit }) {
  const m = computeMetrics(roast)
  const ratings = tastings.map((t) => t.rating).filter((r): r is number => r != null)
  const best = ratings.length ? Math.max(...ratings) : null
  const tags = [...new Set(tastings.flatMap((t) => t.tags))].slice(0, 4)
  return (
    <Link to={`/roasts/${roast.id}`} className="card block transition hover:ring-amber-400">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold">
            {n ? <span className="text-stone-500">#{n} </span> : null}
            {bean?.name ?? 'No bean'}
          </div>
          <div className="text-xs text-stone-500">
            {fmtDate(roast.roasted_at)}
            {bean?.country ? ` · ${findOrigin(bean.country)?.name ?? bean.country}` : ''}
            {roast.batch_g ? ` · ${roast.batch_g} g` : ''}
          </div>
        </div>
        <div className="shrink-0 text-amber-500" aria-label={best ? `${best} stars` : 'not tasted'}>
          {best ? '★'.repeat(best) : <span className="text-xs text-stone-400">not tasted</span>}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums text-stone-700 dark:text-stone-300">
        <span>1C {fmtTime(m.fcS)}</span>
        <span>Cool {fmtTime(m.dropS)}</span>
        <span>DTR {fmtPct(m.dtr)}</span>
        {m.weightLossPct != null && <span>Loss {m.weightLossPct.toFixed(1)}%</span>}
        {roast.level && <span>{findLevel(roast.level)?.name}</span>}
      </div>
      {tags.length > 0 && <div className="mt-1 truncate text-xs text-stone-500">{tags.map((t) => findFlavour(t)?.name ?? t).join(' · ')}</div>}
    </Link>
  )
}
