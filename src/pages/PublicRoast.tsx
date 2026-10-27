import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useRoastNumbers, useStore } from '../data/store'
import { fetchPublicRoast, publicBean, publicRoast, publicTastings, type PublicRow } from '../lib/public'
import RoastChart from '../components/RoastChart'
import OriginGuide from '../components/OriginGuide'
import TastingSummary from '../components/TastingSummary'
import { Empty, Header, Stat } from '../components/ui'
import { computeMetrics } from '../lib/metrics'
import { downloadText, readingsCsv } from '../lib/export'
import { fmtDate, fmtDateTime, fmtPct, fmtTemp, fmtTime, uid } from '../lib/format'
import { findOrigin } from '../knowledge/origins'
import { findProcess } from '../knowledge/processes'
import { findLevel } from '../knowledge/roasting'
import { findFlavour } from '../knowledge/flavours'
import { findPlan } from '../knowledge/gene'

export default function PublicRoast() {
  const { id } = useParams()
  const { session, roasts, beans, settings, saveBean, unshareRoast } = useStore()
  const numbers = useRoastNumbers()
  const navigate = useNavigate()
  const unit = settings.unit
  const [row, setRow] = useState<PublicRow | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [compareId, setCompareId] = useState('')

  useEffect(() => {
    if (!id) return
    setState('loading')
    fetchPublicRoast(id).then(({ row: r, error: err }) => {
      if (err) {
        setError(navigator.onLine ? err : 'You’re offline. Open the library again when you have a connection.')
        setState('error')
      } else if (!r?.data) setState('missing')
      else {
        setRow(r)
        setState('ok')
      }
    })
  }, [id])

  if (state !== 'ok' || !row) {
    return (
      <div className="page">
        <Header title="Shared roast" back="/library" />
        <Empty>{state === 'loading' ? 'Loading…' : state === 'missing' ? 'This roast isn’t in the public library (any more).' : error}</Empty>
      </div>
    )
  }

  const roast = publicRoast(row)
  const bean = publicBean(row)
  const tastings = publicTastings(row).sort((a, b) => b.tasted_on.localeCompare(a.tasted_on))
  const m = computeMetrics(roast)
  const mine = session?.user.id === row.user_id
  const compare = roasts.find((r) => r.id === compareId) ?? null
  const plan = findPlan(roast.plan_id)
  const alreadyHaveBean = bean && beans.some((b) => b.name === bean.name && b.country === bean.country)

  function addBean() {
    if (!bean) return
    const now = new Date().toISOString()
    const copy = { ...bean, id: uid(), notes: null, created_at: now, updated_at: now }
    saveBean(copy)
    navigate(`/beans/${copy.id}`)
  }

  return (
    <div className="page space-y-4">
      <Header title={row.bean_name ?? 'Shared roast'} back="/library" />
      <p className="muted -mt-3">
        Shared by <b>{row.display_name}</b>
        {mine ? ' (you)' : ''} · roasted {fmtDate(roast.roasted_at)}
        {row.updated_at !== row.published_at ? ` · updated ${fmtDateTime(row.updated_at)}` : ''}
        {plan ? ` · plan: ${plan.name}` : ''}
      </p>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        <Stat label="Total" value={fmtTime(m.totalS)} />
        <Stat label="1st crack" value={fmtTime(m.fcS)} sub={m.tempAtFcC != null ? `at ${fmtTemp(m.tempAtFcC, unit)}` : undefined} />
        <Stat label="Development" value={m.devS != null ? fmtTime(m.devS) : '–'} sub={`DTR ${fmtPct(m.dtr, 1)}`} />
        <Stat label="Yellow" value={fmtTime(m.yellowS)} sub={m.dryingPct != null ? `drying ${fmtPct(m.dryingPct)}` : undefined} />
        <Stat label="Batch" value={roast.batch_g ? `${roast.batch_g} g` : '–'} sub={roast.roasted_g ? `→ ${roast.roasted_g} g` : undefined} />
        <Stat label="Weight loss" value={m.weightLossPct != null ? `${m.weightLossPct.toFixed(1)}%` : '–'} />
        <Stat label="Level" value={findLevel(roast.level)?.name ?? '–'} />
        <Stat label="Set temps" value={roast.setpoints.length ? roast.setpoints.map((s) => `${fmtTemp(s.c, unit).replace(/°.$/, '°')}`).join(' → ') : '–'} sub={roast.preheat_c ? `preheat ${fmtTemp(roast.preheat_c, unit)}` : undefined} />
        <Stat label="At cool" value={fmtTemp(m.tempAtDropC, unit)} />
      </div>

      <div className="card">
        <RoastChart roast={roast} reference={compare} referenceLabel={compare ? `Your #${numbers.get(compare.id)}` : undefined} unit={unit} />
        {session && roasts.length > 0 && (
          <select className="input mt-3" value={compareId} onChange={(e) => setCompareId(e.target.value)} aria-label="Compare with one of your roasts">
            <option value="">Compare with one of your roasts…</option>
            {roasts.map((r) => (
              <option key={r.id} value={r.id}>#{numbers.get(r.id)} {beans.find((b) => b.id === r.bean_id)?.name ?? 'Quick roast'} · {fmtDate(r.roasted_at)}</option>
            ))}
          </select>
        )}
        <p className="muted mt-2 text-xs">The temperature is their Gene’s display (exhaust air). Machines read a little differently, so expect your curve to sit a few degrees off theirs.</p>
      </div>

      <div className="card space-y-2">
        {session ? (
          <>
            <Link to={`/roast/new?follow=${row.id}`} className="btn-primary w-full">Roast along with this curve</Link>
            {bean && !mine && (
              <button className="btn-secondary w-full" onClick={addBean} disabled={!!alreadyHaveBean}>
                {alreadyHaveBean ? 'You already have this bean' : 'Add this bean to my beans'}
              </button>
            )}
            {mine && (
              <div className="flex gap-2">
                <Link to={`/roasts/${row.id}`} className="btn-secondary flex-1">Open my roast</Link>
                <button
                  className="btn-ghost text-red-700 dark:text-red-400"
                  onClick={() => {
                    if (confirm('Remove this roast from the public library? Your own copy stays.')) {
                      unshareRoast(row.id)
                      navigate('/library', { replace: true })
                    }
                  }}
                >
                  Remove from library
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm">
            <Link to="/" className="font-semibold text-amber-700 underline dark:text-amber-400">Sign in</Link> to roast along with this curve or add the bean to your own list.
          </p>
        )}
        <button className="btn-ghost w-full text-sm" onClick={() => downloadText(`shared-roast-${row.id.slice(0, 8)}.csv`, readingsCsv(roast, unit))}>Download readings (CSV)</button>
      </div>

      <section className="space-y-2">
        <h2 className="h2">How it tasted</h2>
        {tastings.length ? (
          tastings.map((t) => (
            <div key={t.id} className="card">
              <TastingSummary t={t} roastedAt={roast.roasted_at} />
            </div>
          ))
        ) : (
          <Empty>No tasting shared yet.</Empty>
        )}
      </section>

      {(roast.notes || roast.appearance.length > 0) && (
        <div className="card text-sm">
          {roast.appearance.length > 0 && <p><b>Looked:</b> {roast.appearance.join(', ')}</p>}
          {roast.notes && <p className="mt-1 whitespace-pre-wrap">{roast.notes}</p>}
        </div>
      )}

      {bean && (
        <section className="card space-y-3">
          <h2 className="h2">The bean</h2>
          <p className="text-sm">
            {[findOrigin(bean.country)?.name ?? bean.country, bean.region, bean.town, bean.producer].filter(Boolean).join(' · ')}
            {(bean.altitude_min || bean.altitude_max) && ` · ${[bean.altitude_min, bean.altitude_max].filter(Boolean).join('–')} m`}
            {bean.process && ` · ${findProcess(bean.process)?.name ?? bean.process}`}
            {bean.variety && ` · ${bean.variety}`}
            {bean.grade && ` · ${bean.grade}`}
            {bean.harvest && ` · harvest ${bean.harvest}`}
          </p>
          {bean.supplier && <p className="text-sm"><span className="text-stone-500">Bought from: </span>{bean.supplier}</p>}
          {bean.seller_notes && <p className="text-sm"><span className="text-stone-500">Seller says: </span>{bean.seller_notes}</p>}
          {bean.target_flavours.length > 0 && (
            <p className="text-sm"><span className="text-stone-500">They were aiming for: </span>{bean.target_flavours.map((f) => findFlavour(f)?.name ?? f).join(', ')}</p>
          )}
          {bean.notes && <p className="text-sm whitespace-pre-wrap">{bean.notes}</p>}
          <details>
            <summary className="cursor-pointer text-sm font-semibold">What the research says about this bean</summary>
            <div className="mt-2"><OriginGuide bean={bean} /></div>
          </details>
        </section>
      )}
    </div>
  )
}
