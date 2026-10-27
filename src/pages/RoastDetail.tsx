import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useRoastNumbers, useStore } from '../data/store'
import RoastChart from '../components/RoastChart'
import AdviceList from '../components/AdviceList'
import ShareCard from '../components/ShareCard'
import TastingSummary from '../components/TastingSummary'
import { Empty, Header, Stat, numOrNull } from '../components/ui'
import { computeMetrics, setpointAt } from '../lib/metrics'
import { daysBetween, fmtDateTime, fmtDuration, fmtPct, fmtTemp, fmtTime } from '../lib/format'
import { adviseTasting, type HistoryEntry } from '../lib/advice'
import { copyText, downloadText, readingsCsv, roastForClaude } from '../lib/export'
import { findLevel, lossBandFor } from '../knowledge/roasting'
import { findPlan } from '../knowledge/gene'
import { findOrigin } from '../knowledge/origins'

const eventNames: Record<string, string> = {
  yellow: 'Yellow', fc_start: '1st crack', fc_end: '1st crack end', sc_start: '2nd crack', drop: 'Cool', colour: 'Colour', smell: 'Smell', note: 'Note',
}

export default function RoastDetail() {
  const { id } = useParams()
  const { roasts, beans, tastings, settings, saveRoast, deleteRoast, loaded } = useStore()
  const numbers = useRoastNumbers()
  const navigate = useNavigate()
  const unit = settings.unit
  const roast = roasts.find((r) => r.id === id)
  const [compareId, setCompareId] = useState<string>('')
  const [copied, setCopied] = useState<string | null>(null)
  const [weight, setWeight] = useState('')

  const bean = beans.find((b) => b.id === roast?.bean_id) ?? null
  const mine = useMemo(() => tastings.filter((t) => t.roast_id === id).sort((a, b) => b.tasted_on.localeCompare(a.tasted_on)), [tastings, id])
  const history: HistoryEntry[] = useMemo(
    () => (roast?.bean_id ? roasts.filter((r) => r.bean_id === roast.bean_id && r.id !== roast.id).map((r) => ({ roast: r, tastings: tastings.filter((t) => t.roast_id === r.id) })) : []),
    [roasts, tastings, roast],
  )
  if (!roast) return <div className="page"><Header title="Roast" back="/roasts" /><Empty>{loaded ? 'This roast doesn’t exist (any more).' : 'Loading…'}</Empty></div>

  const m = computeMetrics(roast)
  const n = numbers.get(roast.id)
  const compare = roasts.find((r) => r.id === (compareId || '')) ?? null
  const latest = mine[0]
  const advice = latest ? adviseTasting({ roast, bean, tasting: latest, history, unit }) : null
  const plan = findPlan(roast.plan_id)
  const band = lossBandFor(roast.level)

  const flash = (msg: string) => {
    setCopied(msg)
    setTimeout(() => setCopied(null), 2500)
  }

  const timeline = [
    ...roast.events.map((e) => ({ t: e.t, kind: 'event' as const, label: `${eventNames[e.type] ?? e.type}${e.value ? `: ${e.value.replace(/_/g, ' ')}` : ''}${e.note ? `: ${e.note}` : ''}` })),
    ...roast.setpoints.map((s) => ({ t: s.t, kind: 'set' as const, label: `Set ${fmtTemp(s.c, unit)}` })),
    ...roast.readings.map((r) => ({ t: r.t, kind: 'reading' as const, label: fmtTemp(r.c, unit) })),
  ].sort((a, b) => a.t - b.t)

  return (
    <div className="page space-y-4">
      <Header title={`#${n} ${bean?.name ?? 'Quick roast'}`} back="/roasts" action={<Link to={`/roasts/${roast.id}/edit`} className="btn-secondary px-3">Edit</Link>} />
      <p className="muted -mt-3">
        {fmtDateTime(roast.roasted_at)}
        {bean?.country ? ` · ${findOrigin(bean.country)?.name ?? bean.country}` : ''}
        {plan ? ` · plan: ${plan.name}` : ''}
        {bean && <> · <Link className="underline" to={`/beans/${bean.id}`}>bean page</Link></>}
      </p>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        <Stat label="Total" value={fmtTime(m.totalS)} />
        <Stat label="1st crack" value={fmtTime(m.fcS)} sub={m.tempAtFcC != null ? `at ${fmtTemp(m.tempAtFcC, unit)}` : undefined} />
        <Stat label="Development" value={m.devS != null ? fmtTime(m.devS) : '–'} sub={`DTR ${fmtPct(m.dtr, 1)}`} />
        <Stat label="Yellow" value={fmtTime(m.yellowS)} sub={m.dryingPct != null ? `drying ${fmtPct(m.dryingPct)}` : undefined} />
        <Stat label="Maillard" value={m.maillardPct != null ? fmtPct(m.maillardPct) : '–'} sub="of the roast" />
        <Stat label="Weight loss" value={m.weightLossPct != null ? `${m.weightLossPct.toFixed(1)}%` : '–'} sub={roast.batch_g ? `${roast.batch_g} → ${roast.roasted_g ?? '?'} g` : undefined} />
        <Stat label="Level" value={findLevel(roast.level)?.name ?? '–'} sub={roast.target_level ? `aimed: ${findLevel(roast.target_level)?.name}` : undefined} />
        <Stat label="2nd crack" value={fmtTime(m.scS)} />
        <Stat label="At cool" value={fmtTemp(m.tempAtDropC, unit)} sub={m.maxSetC != null ? `max set ${fmtTemp(m.maxSetC, unit)}` : undefined} />
      </div>
      {roast.roasted_g == null && roast.batch_g != null && (
        <div className="card flex items-end gap-2">
          <label className="block flex-1">
            <span className="label">Roasted weight (g)</span>
            <input className="input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={`from ${roast.batch_g} g green`} />
          </label>
          <button className="btn-primary" disabled={numOrNull(weight) == null} onClick={() => saveRoast({ ...roast, roasted_g: numOrNull(weight) })}>Save</button>
        </div>
      )}
      {m.weightLossPct != null && band && (
        <p className="muted -mt-2 text-xs">Published weight loss for {band.label.toLowerCase()}: about {band.min}–{band.max}% (sources vary; your own history matters most).</p>
      )}

      <div className="card">
        <RoastChart roast={roast} reference={compare} referenceLabel={compare ? `#${numbers.get(compare.id)}` : undefined} unit={unit} />
        <select className="input mt-3" value={compareId} onChange={(e) => setCompareId(e.target.value)} aria-label="Compare with another roast">
          <option value="">Compare with another roast…</option>
          {[...history.map((h) => h.roast), ...roasts.filter((r) => r.bean_id !== roast.bean_id && r.id !== roast.id)].map((r) => (
            <option key={r.id} value={r.id}>#{numbers.get(r.id)} {beans.find((b) => b.id === r.bean_id)?.name ?? 'Quick roast'} · {fmtDateTime(r.roasted_at)}</option>
          ))}
        </select>
      </div>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="h2">How it tasted</h2>
          <Link to={`/roasts/${roast.id}/taste`} className="btn-primary px-3 py-1.5 text-sm">+ Tasting</Link>
        </div>
        {mine.length === 0 && (
          <Empty>
            <p>No tasting yet. Rest it {daysBetween(roast.roasted_at, new Date().toISOString().slice(0, 10)) < 1 ? 'at least 24–48 hours' : 'a little'}, brew it, then tell the app how it tasted to get advice for the next roast.</p>
          </Empty>
        )}
        {mine.map((t) => (
          <Link key={t.id} to={`/roasts/${roast.id}/taste/${t.id}`} className="card block">
            <TastingSummary t={t} roastedAt={roast.roasted_at} />
          </Link>
        ))}
      </section>

      {advice && (
        <section className="card">
          <h2 className="h2 mb-2">Next roast</h2>
          <AdviceList advice={advice} />
          <p className="muted mt-3 text-xs">Based on your latest tasting ({latest.tasted_on}). Change one thing at a time so you can tell what it did.</p>
        </section>
      )}

      <section className="card space-y-2">
        <h2 className="h2">Ask Claude</h2>
        <p className="muted">Copies this roast, the bean, your tastings, your other roasts of this bean and the app’s suggestion as text. Paste it into a new Claude chat.</p>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-primary"
            onClick={async () => {
              const ok = await copyText(roastForClaude({ roast, bean, tastings: mine, history, unit, n }))
              flash(ok ? 'Copied: paste it into Claude' : 'Couldn’t copy')
            }}
          >
            Copy for Claude
          </button>
          <button className="btn-secondary" onClick={() => downloadText(`roast-${n}-readings.csv`, readingsCsv(roast, unit))}>Readings CSV</button>
          <button className="btn-secondary" onClick={async () => flash((await copyText(readingsCsv(roast, unit))) ? 'CSV copied' : 'Couldn’t copy')}>Copy CSV</button>
        </div>
        {copied && <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400" role="status">{copied}</p>}
      </section>

      <ShareCard roastId={roast.id} />

      <details className="card">
        <summary className="cursor-pointer font-semibold">All readings &amp; events ({timeline.length})</summary>
        <table className="mt-2 w-full text-sm tabular-nums">
          <thead>
            <tr className="text-left text-xs text-stone-500"><th className="py-1">Time</th><th>Entry</th><th>Set</th></tr>
          </thead>
          <tbody>
            {timeline.map((x, i) => (
              <tr key={i} className="border-t border-stone-100 dark:border-stone-800">
                <td className="py-1 pr-3">{fmtTime(x.t)}</td>
                <td className={x.kind === 'event' ? 'font-semibold' : x.kind === 'set' ? 'text-amber-700 dark:text-amber-400' : ''}>{x.label}</td>
                <td className="text-stone-500">{x.kind === 'reading' ? fmtTemp(setpointAt(roast.setpoints, x.t), unit) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      {(roast.notes || roast.appearance.length > 0) && (
        <div className="card text-sm">
          {roast.appearance.length > 0 && <p><b>Looked:</b> {roast.appearance.join(', ')}</p>}
          {roast.notes && <p className="mt-1 whitespace-pre-wrap">{roast.notes}</p>}
        </div>
      )}
      {m.devS != null && <p className="muted text-xs">Development {fmtDuration(m.devS)} from first crack at {fmtTime(m.fcS)} to cool at {fmtTime(m.dropS)}.</p>}

      <button
        className="btn-ghost w-full text-red-700 dark:text-red-400"
        onClick={() => {
          if (confirm('Delete this roast and its tastings?')) {
            deleteRoast(roast.id)
            navigate('/roasts', { replace: true })
          }
        }}
      >
        Delete roast
      </button>
    </div>
  )
}
