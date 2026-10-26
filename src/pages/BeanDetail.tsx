import { Link, useParams } from 'react-router-dom'
import { useRoastNumbers, useStore } from '../data/store'
import { Empty, Header } from '../components/ui'
import OriginGuide from '../components/OriginGuide'
import { computeMetrics } from '../lib/metrics'
import { fmtDate, fmtPct, fmtTime } from '../lib/format'
import { adviseTasting } from '../lib/advice'
import { findOrigin } from '../knowledge/origins'
import { findProcess } from '../knowledge/processes'
import { findFlavour } from '../knowledge/flavours'
import { findLevel } from '../knowledge/roasting'

export default function BeanDetail() {
  const { id } = useParams()
  const { beans, roasts, tastings, settings, loaded } = useStore()
  const numbers = useRoastNumbers()
  const bean = beans.find((b) => b.id === id)
  if (!bean) return <div className="page"><Header title="Bean" back="/beans" /><Empty>{loaded ? 'Bean not found.' : 'Loading…'}</Empty></div>

  const rs = roasts.filter((r) => r.bean_id === bean.id).sort((a, b) => a.roasted_at.localeCompare(b.roasted_at))
  const rows = rs.map((r) => {
    const ts = tastings.filter((t) => t.roast_id === r.id)
    const ratings = ts.map((t) => t.rating).filter((x): x is number => x != null)
    return { r, m: computeMetrics(r), ts, best: ratings.length ? Math.max(...ratings) : null }
  })
  const topRating = Math.max(0, ...rows.map((x) => x.best ?? 0))
  const lastTasted = [...rows].reverse().find((x) => x.ts.length)
  const advice = lastTasted
    ? adviseTasting({
        roast: lastTasted.r,
        bean,
        tasting: [...lastTasted.ts].sort((a, b) => b.tasted_on.localeCompare(a.tasted_on))[0],
        history: rows.filter((x) => x.r.id !== lastTasted.r.id).map((x) => ({ roast: x.r, tastings: x.ts })),
        unit: settings.unit,
      })
    : null

  return (
    <div className="page space-y-4">
      <Header title={bean.name} back="/beans" action={<Link to={`/beans/${bean.id}/edit`} className="btn-secondary px-3">Edit</Link>} />
      <p className="muted -mt-3">
        {[findOrigin(bean.country)?.name ?? bean.country, bean.region, bean.town, bean.producer].filter(Boolean).join(' · ')}
        {(bean.altitude_min || bean.altitude_max) && ` · ${[bean.altitude_min, bean.altitude_max].filter(Boolean).join('–')} m`}
        {bean.process && ` · ${findProcess(bean.process)?.name ?? bean.process}`}
        {bean.variety && ` · ${bean.variety}`}
        {bean.grade && ` · ${bean.grade}`}
      </p>
      {(bean.seller_notes || bean.target_flavours.length > 0) && (
        <div className="card text-sm">
          {bean.seller_notes && <p><span className="text-stone-500">Seller: </span>{bean.seller_notes}</p>}
          {bean.target_flavours.length > 0 && <p className="mt-1"><span className="text-stone-500">Aiming for: </span>{bean.target_flavours.map((f) => findFlavour(f)?.name ?? f).join(', ')}</p>}
        </div>
      )}

      <Link to={`/roast/new?bean=${bean.id}`} className="btn-primary w-full py-3">Roast this bean</Link>

      {advice && lastTasted && (
        <div className="card">
          <h2 className="h2">For the next roast</h2>
          <p className="mt-1">{advice.headline}</p>
          <Link to={`/roasts/${lastTasted.r.id}`} className="mt-1 inline-block text-sm text-amber-700 underline dark:text-amber-400">
            Details on roast #{numbers.get(lastTasted.r.id)} →
          </Link>
        </div>
      )}

      <section className="card">
        <h2 className="h2 mb-2">Your roasts of this bean</h2>
        {rows.length ? (
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm tabular-nums">
              <thead>
                <tr className="text-left text-xs text-stone-500">
                  <th className="px-1 py-1">#</th><th className="px-1">Date</th><th className="px-1">1C</th><th className="px-1">Cool</th><th className="px-1">Dev</th><th className="px-1">DTR</th><th className="px-1">Loss</th><th className="px-1">Level</th><th className="px-1">★</th><th className="px-1">Flavours</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ r, m, ts, best }) => (
                  <tr key={r.id} className={`border-t border-stone-100 dark:border-stone-800 ${best != null && best === topRating && topRating > 0 ? 'bg-amber-50 dark:bg-amber-950/30' : ''}`}>
                    <td className="px-1 py-1.5"><Link className="underline" to={`/roasts/${r.id}`}>{numbers.get(r.id)}</Link></td>
                    <td className="px-1">{fmtDate(r.roasted_at)}</td>
                    <td className="px-1">{fmtTime(m.fcS)}</td>
                    <td className="px-1">{fmtTime(m.dropS)}</td>
                    <td className="px-1">{m.devS != null ? fmtTime(m.devS) : '–'}</td>
                    <td className="px-1">{fmtPct(m.dtr)}</td>
                    <td className="px-1">{m.weightLossPct != null ? `${m.weightLossPct.toFixed(1)}%` : '–'}</td>
                    <td className="px-1">{findLevel(r.level)?.name ?? '–'}</td>
                    <td className="px-1 text-amber-500">{best ?? ''}</td>
                    <td className="max-w-40 truncate px-1 text-xs">{[...new Set(ts.flatMap((t) => t.tags))].map((x) => findFlavour(x)?.name ?? x).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Not roasted yet.</p>
        )}
      </section>

      <section className="card">
        <h2 className="h2 mb-2">What the research says</h2>
        <OriginGuide bean={bean} />
      </section>
    </div>
  )
}
