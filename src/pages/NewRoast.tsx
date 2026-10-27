import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useRoastNumbers, useStore } from '../data/store'
import { live, useLive } from '../lib/live'
import { Field, Header, SourceLinks, numOrNull } from '../components/ui'
import { findPlan, plans, preheatHowTo, type Plan } from '../knowledge/gene'
import { findOrigin, isAmericas } from '../knowledge/origins'
import { findProcess } from '../knowledge/processes'
import { roastLevels } from '../knowledge/roasting'
import { brewMethods } from '../knowledge/flavours'
import { targetLevelId } from '../lib/advice'
import { computeMetrics } from '../lib/metrics'
import { fmtDate, fmtPct, fmtTime, tempIn, toC, uid } from '../lib/format'
import type { Bean, Roast } from '../lib/types'
import { fetchPublicRoast, publicRoast, type PublicRow } from '../lib/public'

function suggestPlan(bean: Bean | undefined): { plan: Plan; why: string } | null {
  const origin = findOrigin(bean?.country)
  if (!bean || !origin) return null
  const alt = bean.altitude_max ?? bean.altitude_min
  if (origin.id === 'brazil') return { plan: findPlan('rr-santos')!, why: 'Published Gene profile for Brazilian Santos-type beans.' }
  if (isAmericas(origin) && (alt == null || alt >= 1350) && bean.process !== 'natural')
    return { plan: findPlan('rr-shb')!, why: 'Published Gene profile for strictly-hard-bean Central & South American coffees.' }
  if (bean.process === 'natural') return { plan: findPlan('hb-gentle')!, why: 'Naturals scorch easily, so start a little gentler than full power.' }
  return { plan: findPlan('sm-max')!, why: 'Sweet Maria’s general Gene starting point.' }
}

export default function NewRoast() {
  const { beans, roasts, tastings, settings } = useStore()
  const liveRoast = useLive()
  const numbers = useRoastNumbers()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const unit = settings.unit
  const active = beans.filter((b) => !b.archived)
  const [beanId, setBeanId] = useState(params.get('bean') ?? active[0]?.id ?? '')
  const bean = beans.find((b) => b.id === beanId)
  const origin = findOrigin(bean?.country)
  const process = findProcess(bean?.process)

  // Best earlier roast of this bean (or the latest one) is the default overlay.
  const sameBean = useMemo(() => roasts.filter((r) => r.bean_id === beanId), [roasts, beanId])
  const bestRef = useMemo(() => {
    const scored = sameBean.map((r) => ({ r, rating: Math.max(0, ...tastings.filter((t) => t.roast_id === r.id).map((t) => t.rating ?? 0)) }))
    scored.sort((a, b) => b.rating - a.rating || b.r.roasted_at.localeCompare(a.r.roasted_at))
    return scored[0]?.r ?? null
  }, [sameBean, tastings])
  const suggestion = suggestPlan(bean)

  // "Roast along" with someone's roast from the public library.
  const followId = params.get('follow')
  const [follow, setFollow] = useState<PublicRow | null>(null)
  const [followError, setFollowError] = useState<string | null>(null)
  useEffect(() => {
    if (!followId) return
    fetchPublicRoast(followId).then(({ row, error }) => {
      if (row?.data) setFollow(row)
      else setFollowError(error ?? 'That roast is no longer in the public library.')
    })
  }, [followId])
  const followCurve = follow ? publicRoast(follow) : null
  const followM = followCurve ? computeMetrics(followCurve) : null

  const [refId, setRefId] = useState<string | null>(null)
  const [planId, setPlanId] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const effectiveRef = touched ? refId : followId ? null : (bestRef?.id ?? null)
  const effectivePlan = touched ? planId : bestRef || followId ? null : (suggestion?.plan.id ?? null)
  const plan = findPlan(effectivePlan)
  const reference = roasts.find((r) => r.id === effectiveRef)

  const firstSet = plan?.steps[0]?.c ?? reference?.setpoints[0]?.c ?? followCurve?.setpoints[0]?.c ?? null
  const [batch, setBatch] = useState('')
  const [setTemp, setSetTemp] = useState('')
  const [preheat, setPreheat] = useState('')
  const [ambient, setAmbient] = useState('')
  const [level, setLevel] = useState('')
  const [brew, setBrew] = useState('')

  if (liveRoast) return <Navigate to="/roast/live" replace />

  const defaultBatch = plan?.batch_g ?? reference?.batch_g ?? followCurve?.batch_g ?? (process?.id === 'natural' ? 200 : settings.batch_g)
  const defaultLevel = targetLevelId({ target_level: null } as Roast, origin) ?? ''

  function start() {
    const now = new Date().toISOString()
    const startC = numOrNull(setTemp)
    const set = startC != null ? (unit === 'F' ? toC(startC) : startC) : firstSet
    const pre = numOrNull(preheat)
    const amb = numOrNull(ambient)
    const roast: Roast = {
      id: uid(),
      bean_id: bean?.id ?? null,
      roasted_at: now,
      batch_g: numOrNull(batch) ?? defaultBatch,
      roasted_g: null,
      ambient_c: amb != null ? (unit === 'F' ? toC(amb) : amb) : null,
      // Only what was actually typed: an empty box means you didn't preheat.
      preheat_c: pre != null ? (unit === 'F' ? toC(pre) : pre) : null,
      brew: brew || null,
      target_level: level || defaultLevel || null,
      plan_id: plan?.id ?? null,
      reference_id: reference?.id ?? null,
      readings: [],
      setpoints: set != null ? [{ t: 0, c: set }] : [],
      events: [],
      level: null,
      appearance: [],
      notes: null,
      created_at: now,
      updated_at: now,
    }
    const label = follow ? `${follow.display_name}’s roast` : null
    live.start(roast, Date.now(), follow && followCurve && label ? { label, curve: followCurve } : undefined)
    navigate('/roast/live')
  }

  const refM = reference ? computeMetrics(reference) : null

  return (
    <div className="page space-y-4">
      <Header title="New roast" back="/" />

      <div className="card space-y-3">
        <Field label="Green beans">
          <select className="input" value={beanId} onChange={(e) => { setBeanId(e.target.value); setTouched(false) }}>
            <option value="">No bean / quick roast</option>
            {active.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </Field>
        <Link to="/beans/new?then=roast" className="text-sm text-amber-700 underline dark:text-amber-400">+ Add a new bean</Link>
        {origin && (
          <p className="muted">
            {origin.name}
            {process ? ` · ${process.name}` : ''}: {origin.typical}
          </p>
        )}
      </div>

      {followId && (
        <div className="card border-l-4 border-sky-600 text-sm">
          {follow && followM ? (
            <>
              <p className="font-semibold">Roasting along with {follow.display_name}’s roast{follow.bean_name ? ` of ${follow.bean_name}` : ''}</p>
              <p className="muted mt-1">
                {followCurve?.batch_g ? `${followCurve.batch_g} g · ` : ''}yellow {fmtTime(followM.yellowS)} · first crack {fmtTime(followM.fcS)} · cool {fmtTime(followM.dropS)} · DTR {fmtPct(followM.dtr)}
                {followCurve?.setpoints.length ? ` · set ${followCurve.setpoints.map((s) => `${tempIn(s.c, unit)}°`).join(' → ')}` : ''}
              </p>
              <p className="muted mt-1">Their curve is drawn behind yours while you roast. Remember every Gene reads a little differently.</p>
            </>
          ) : (
            <p>{followError ?? 'Loading the roast you’re following…'}</p>
          )}
          <Link to="/roast/new" className="mt-2 inline-block text-amber-700 underline dark:text-amber-400">Don’t follow it</Link>
        </div>
      )}

      <div className="card space-y-3">
        <h2 className="h2">Plan</h2>
        <Field label="Overlay an earlier roast (to follow its curve)">
          <select className="input" value={effectiveRef ?? ''} onChange={(e) => { setTouched(true); setRefId(e.target.value || null); setPlanId(effectivePlan) }}>
            <option value="">None</option>
            {[...sameBean, ...roasts.filter((r) => r.bean_id !== beanId)].slice(0, 40).map((r) => (
              <option key={r.id} value={r.id}>
                #{numbers.get(r.id)} {beans.find((b) => b.id === r.bean_id)?.name ?? 'No bean'} · {fmtDate(r.roasted_at)}
                {r.id === bestRef?.id ? ' (best of this bean)' : ''}
              </option>
            ))}
          </select>
        </Field>
        {reference && refM && (
          <p className="muted">
            That roast: yellow {fmtTime(refM.yellowS)}, first crack {fmtTime(refM.fcS)}, cool {fmtTime(refM.dropS)}, DTR {fmtPct(refM.dtr)}
            {reference.setpoints.length ? `, set ${reference.setpoints.map((s) => `${tempIn(s.c, unit)}°`).join(' → ')}` : ''}.
          </p>
        )}
        <Field label="Starting plan">
          <select className="input" value={effectivePlan ?? ''} onChange={(e) => { setTouched(true); setPlanId(e.target.value || null); setRefId(effectiveRef) }}>
            <option value="">None: I’ll set the Gene myself</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.id === suggestion?.plan.id ? ' (suggested)' : ''}
              </option>
            ))}
          </select>
        </Field>
        {plan && (
          <div className="rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-950/40">
            <p>{plan.note}</p>
            {plan.preheat_c != null && <p className="mt-2">{preheatHowTo}</p>}
            {plan.id === suggestion?.plan.id && <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">Why: {suggestion.why}</p>}
            <SourceLinks ids={plan.sources} className="mt-2" />
          </div>
        )}
      </div>

      <div className="card grid grid-cols-2 gap-3">
        <Field label="Green weight (g)" hint={process?.id === 'natural' ? 'Sweet Maria’s: 200 g for naturals' : 'Sweet Maria’s: 250 g'}>
          <input className="input" inputMode="decimal" placeholder={String(defaultBatch)} value={batch} onChange={(e) => setBatch(e.target.value)} />
        </Field>
        <Field label={`Starting set temp (°${unit})`} hint={firstSet != null ? `Empty = ${tempIn(firstSet, unit)}°${plan ? ' from the plan' : ''}` : undefined}>
          <input className="input" inputMode="numeric" placeholder={firstSet != null ? String(tempIn(firstSet, unit)) : 'optional'} value={setTemp} onChange={(e) => setSetTemp(e.target.value)} />
        </Field>
        <Field label={`Preheat (°${unit})`} hint={plan?.preheat_c ? `Plan: ${tempIn(plan.preheat_c, unit)}°. Type it if you preheated; empty = no preheat` : 'Empty = no preheat'}>
          <input className="input" inputMode="numeric" placeholder="none" value={preheat} onChange={(e) => setPreheat(e.target.value)} />
        </Field>
        <Field label={`Room temp (°${unit})`} hint="Cold rooms slow the Gene">
          <input className="input" inputMode="numeric" placeholder="optional" value={ambient} onChange={(e) => setAmbient(e.target.value)} />
        </Field>
        <Field label="Aiming for">
          <select className="input" value={level || defaultLevel} onChange={(e) => setLevel(e.target.value)}>
            <option value="">Not sure</option>
            {roastLevels.filter((l) => l.id !== 'under').map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </Field>
        <Field label="For">
          <select className="input" value={brew} onChange={(e) => setBrew(e.target.value)}>
            <option value="">Any</option>
            {brewMethods.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="card text-sm">
        <p className="font-semibold">Before you press start</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-stone-700 dark:text-stone-300">
          <li>Weigh the green beans, so you can weigh the roasted ones after.</li>
          <li>Set the Gene’s timer longer than you need and press cool yourself. It keeps roasting a bit while it cools, so press slightly early.</li>
          <li>Start this timer the moment the beans go in (or when you start the Gene).</li>
        </ul>
        <SourceLinks ids={['smGeneTips']} className="mt-2" />
      </div>

      <button className="btn-primary w-full py-4 text-lg" onClick={start}>Beans in: start the timer</button>
    </div>
  )
}
