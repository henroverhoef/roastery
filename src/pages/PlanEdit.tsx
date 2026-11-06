import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useRoastNumbers, useStore } from '../data/store'
import { Empty, Field, Header, numOrNull } from '../components/ui'
import RoastChart from '../components/RoastChart'
import { findPlan, type PlanDrop, type PlanStep } from '../knowledge/gene'
import { roastLevels } from '../knowledge/roasting'
import { emptyPlanData, planAsCurve, planDataFromRoast, planFromRow, thinCurve, type PlanData, type PlanRow } from '../lib/plans'
import { computeMetrics } from '../lib/metrics'
import { fmtDate, fmtPct, fmtTime, parseTime, tempIn, toC, uid } from '../lib/format'
import type { Roast, Unit } from '../lib/types'
import { planToCsv } from '../lib/planCsv'
import { copyText } from '../lib/export'

export default function PlanEdit() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { plans, roasts, beans, loaded } = useStore()
  const numbers = useRoastNumbers()
  const existing = plans.find((p) => p.id === id)
  const fromId = params.get('from')
  const fromRoast = roasts.find((r) => r.id === fromId)
  const base = findPlan(params.get('base'))

  if ((id && !existing) || (fromId && !fromRoast)) {
    return <div className="page"><Header title="Plan" back="/plans" /><Empty>{loaded ? 'Not found.' : 'Loading…'}</Empty></div>
  }

  const now = new Date().toISOString()
  let initial: PlanRow
  if (existing) initial = existing
  else if (fromRoast) {
    const drop = numOrNull(params.get('drop') ?? '')
    const bean = beans.find((b) => b.id === fromRoast.bean_id)
    const was = computeMetrics(fromRoast).dropS
    initial = {
      id: uid(),
      name: `Plan from #${numbers.get(fromRoast.id)} ${bean?.name ?? 'roast'}`.slice(0, 80),
      bean_id: fromRoast.bean_id,
      data: {
        ...planDataFromRoast(fromRoast, drop),
        note: drop != null && was != null ? `Cool moved to ${fmtTime(drop)} (was ${fmtTime(was)}), as the app suggested after tasting.` : null,
      },
      created_at: now,
      updated_at: now,
    }
  } else if (base) {
    initial = {
      id: uid(),
      name: `${base.name} (my version)`.slice(0, 80),
      bean_id: params.get('bean'),
      data: { ...emptyPlanData(), batch_g: base.batch_g ?? null, preheat_c: base.preheat_c ?? null, steps: base.steps },
      created_at: now,
      updated_at: now,
    }
  } else {
    initial = { id: uid(), name: 'My plan', bean_id: params.get('bean'), data: emptyPlanData(), created_at: now, updated_at: now }
  }
  return <Editor key={initial.id} initial={initial} isNew={!existing} />
}

type StepRow = { when: PlanStep['when']; time: string; temp: string }
type PointRow = { time: string; temp: string }

const whenLabel: Record<PlanStep['when'], string> = { start: 'From start', time: 'At time', fc: '1st crack +' }

function Editor({ initial, isNew }: { initial: PlanRow; isNew: boolean }) {
  const { settings, beans, roasts, savePlan, deletePlan } = useStore()
  const numbers = useRoastNumbers()
  const navigate = useNavigate()
  const unit: Unit = settings.unit
  const d = initial.data
  const tIn = (c: number | null | undefined) => (c == null ? '' : String(tempIn(c, unit)))
  const cOut = (s: string) => {
    const v = numOrNull(s)
    return v == null ? null : unit === 'F' ? toC(v) : v
  }

  const [name, setName] = useState(initial.name)
  const [beanId, setBeanId] = useState(initial.bean_id ?? '')
  const [batch, setBatch] = useState(d.batch_g?.toString() ?? '')
  const [preheat, setPreheat] = useState(tIn(d.preheat_c))
  const [level, setLevel] = useState(d.target_level ?? '')
  const [note, setNote] = useState(d.note ?? '')
  const [steps, setSteps] = useState<StepRow[]>(() =>
    d.steps.length
      ? d.steps.map((s) => ({ when: s.when, time: s.when === 'time' ? fmtTime(s.at_s ?? 0) : s.when === 'fc' ? fmtTime(s.offset_s ?? 0) : '', temp: tIn(s.c) }))
      : [{ when: 'start', time: '', temp: '' }],
  )
  const [yellow, setYellow] = useState(d.targets.yellow_s != null ? fmtTime(d.targets.yellow_s) : '')
  const [fc, setFc] = useState(d.targets.fc_s != null ? fmtTime(d.targets.fc_s) : '')
  const [dropMode, setDropMode] = useState<PlanDrop['mode']>(d.drop?.mode ?? 'dev')
  const [dropValue, setDropValue] = useState(d.drop ? (d.drop.mode === 'dtr' ? String(Math.round(d.drop.value * 1000) / 10) : fmtTime(d.drop.value)) : '')
  const [copied, setCopied] = useState<string | null>(null)
  const [points, setPoints] = useState<PointRow[]>(() => d.curve.map((p) => ({ time: fmtTime(p.t), temp: tIn(p.c) })))

  const data: PlanData = useMemo(() => {
    const parsedSteps: PlanStep[] = []
    for (const r of steps) {
      const c = cOut(r.temp)
      if (c == null) continue
      if (r.when === 'start') parsedSteps.push({ when: 'start', c })
      else if (r.when === 'time') {
        const at = parseTime(r.time)
        if (at != null) parsedSteps.push({ when: 'time', at_s: Math.round(at), c })
      } else parsedSteps.push({ when: 'fc', offset_s: Math.max(0, Math.round(parseTime(r.time) ?? 0)), c })
    }
    const dv = dropMode === 'dtr' ? numOrNull(dropValue) : parseTime(dropValue)
    const drop: PlanDrop | null = dv == null ? null : dropMode === 'dtr' ? (dv > 0 && dv < 100 ? { mode: 'dtr', value: dv / 100 } : null) : { mode: dropMode, value: Math.round(dv) }
    const curve = points
      .map((p) => ({ t: parseTime(p.time), c: cOut(p.temp) }))
      .filter((p): p is { t: number; c: number } => p.t != null && p.c != null)
      .map((p) => ({ t: Math.round(p.t), c: Math.round(p.c * 10) / 10 }))
      .sort((a, b) => a.t - b.t)
    const ys = parseTime(yellow)
    const fs = parseTime(fc)
    return {
      batch_g: numOrNull(batch),
      preheat_c: cOut(preheat),
      target_level: level || null,
      note: note.trim() || null,
      steps: parsedSteps,
      curve,
      targets: { yellow_s: ys != null ? Math.round(ys) : null, fc_s: fs != null ? Math.round(fs) : null },
      drop,
    }
  }, [steps, dropMode, dropValue, points, yellow, fc, batch, preheat, level, note, unit])

  const row: PlanRow = { ...initial, name: name.trim() || 'My plan', bean_id: beanId || null, data }
  const plan = planFromRow(row)
  const preview = planAsCurve(plan)
  const m = computeMetrics(preview)
  const noSet = !data.steps.length

  function save(thenRoast: boolean) {
    savePlan(row)
    navigate(thenRoast ? `/roast/new?plan=${row.id}${row.bean_id ? `&bean=${row.bean_id}` : ''}` : '/plans', { replace: true })
  }

  function copyCurve(r: Roast) {
    const cm = computeMetrics(r)
    const pts = thinCurve(r.readings.filter((x) => cm.dropS == null || x.t <= cm.dropS))
    setPoints(pts.map((p) => ({ time: fmtTime(p.t), temp: tIn(p.c) })))
  }

  return (
    <div className="page space-y-4">
      <Header title={isNew ? 'New plan' : 'Edit plan'} back="/plans" />
      <p className="muted -mt-2">
        Plan what you’ll do on the Gene and what you expect the display to show. Dial changes can happen at a time or at first crack (first crack moves
        around, so changes tied to it follow your real first crack). While you roast, the plan is drawn behind your curve and the app tells you whether you’re ahead or behind.
      </p>

      <div className="card">
        <RoastChart roast={preview} unit={unit} height={190} rorHeight={64} legendNames={{ display: 'Target display', set: 'Plan set temp' }} />
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums text-stone-700 dark:text-stone-300">
          <span>Drying {fmtPct(m.dryingPct)}</span>
          <span>Maillard {fmtPct(m.maillardPct)}</span>
          <span>Development {m.devS != null ? fmtTime(m.devS) : '–'}</span>
          <span>DTR {fmtPct(m.dtr, 1)}</span>
          <span>Cool {fmtTime(m.dropS)}</span>
        </div>
        {!data.curve.length && <p className="muted mt-1 text-xs">Add target points below (or copy a roast’s curve) to see a target line.</p>}
      </div>

      <div className="card grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Name">
            <input className="input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="For bean (optional)">
            <select className="input" value={beanId} onChange={(e) => setBeanId(e.target.value)}>
              <option value="">Any bean</option>
              {beans.filter((b) => !b.archived || b.id === beanId).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Green weight (g)">
          <input className="input" inputMode="decimal" value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="optional" />
        </Field>
        <Field label={`Preheat (°${unit})`} hint="Empty = no preheat">
          <input className="input" inputMode="numeric" value={preheat} onChange={(e) => setPreheat(e.target.value)} placeholder="none" />
        </Field>
        <div className="col-span-2">
          <Field label="Aiming for">
            <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="">Not set</option>
              {roastLevels.filter((l) => l.id !== 'under').map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className="card space-y-2">
        <h2 className="h2">Set temperature on the Gene</h2>
        {steps.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_4.5rem_4.5rem_2.5rem] items-center gap-2">
            <select
              className="input px-2 text-sm"
              value={r.when}
              aria-label="When"
              onChange={(e) => setSteps(steps.map((x, j) => (j === i ? { ...x, when: e.target.value as PlanStep['when'] } : x)))}
            >
              {(['start', 'time', 'fc'] as const).map((w) => <option key={w} value={w}>{whenLabel[w]}</option>)}
            </select>
            {r.when === 'start' ? (
              <span />
            ) : (
              <input
                className="input px-2"
                aria-label={r.when === 'time' ? 'Time (m:ss)' : 'Seconds after 1st crack'}
                placeholder={r.when === 'time' ? 'm:ss' : '0:45'}
                value={r.time}
                onChange={(e) => setSteps(steps.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))}
              />
            )}
            <input
              className="input px-2"
              inputMode="numeric"
              aria-label={`°${unit}`}
              placeholder={`°${unit}`}
              value={r.temp}
              onChange={(e) => setSteps(steps.map((x, j) => (j === i ? { ...x, temp: e.target.value } : x)))}
            />
            <button className="btn-ghost px-0" aria-label="Remove" onClick={() => setSteps(steps.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button className="btn-secondary w-full" onClick={() => setSteps([...steps, { when: steps.length ? 'fc' : 'start', time: '', temp: '' }])}>+ Add a dial change</button>
        {noSet && <p className="text-sm text-amber-700 dark:text-amber-400">Add at least the starting set temperature.</p>}
      </div>

      <div className="card space-y-3">
        <h2 className="h2">Targets</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Yellow at (m:ss)">
            <input className="input" value={yellow} onChange={(e) => setYellow(e.target.value)} placeholder="e.g. 4:30" />
          </Field>
          <Field label="1st crack at (m:ss)">
            <input className="input" value={fc} onChange={(e) => setFc(e.target.value)} placeholder="e.g. 9:00" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Press cool">
            <select className="input px-2 text-sm" value={dropMode} onChange={(e) => setDropMode(e.target.value as PlanDrop['mode'])}>
              <option value="dev">After 1st crack</option>
              <option value="time">At a time</option>
              <option value="dtr">At DTR %</option>
            </select>
          </Field>
          <Field label={dropMode === 'dtr' ? 'DTR %' : dropMode === 'dev' ? 'After 1st crack (m:ss)' : 'At (m:ss)'}>
            <input className="input" value={dropValue} onChange={(e) => setDropValue(e.target.value)} placeholder={dropMode === 'dtr' ? 'e.g. 20' : dropMode === 'dev' ? 'e.g. 2:15' : 'e.g. 11:30'} />
          </Field>
        </div>
        <p className="muted text-xs">“After 1st crack” follows your real first crack, so it’s usually the most useful on the Gene. Scott Rao’s 20–25% DTR band is a common starting point.</p>
      </div>

      <div className="card space-y-2">
        <h2 className="h2">Target curve (what the display should show)</h2>
        <select
          className="input"
          value=""
          onChange={(e) => {
            const r = roasts.find((x) => x.id === e.target.value)
            if (r) copyCurve(r)
          }}
          aria-label="Copy the curve from one of your roasts"
        >
          <option value="">Copy the curve from one of your roasts…</option>
          {roasts.map((r) => (
            <option key={r.id} value={r.id}>#{numbers.get(r.id)} {beans.find((b) => b.id === r.bean_id)?.name ?? 'Quick roast'} · {fmtDate(r.roasted_at)}</option>
          ))}
        </select>
        {points.map((p, i) => (
          <div key={i} className="flex gap-2">
            <input className="input w-24" aria-label="Time (m:ss)" placeholder="m:ss" value={p.time} onChange={(e) => setPoints(points.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))} />
            <input className="input flex-1" inputMode="numeric" aria-label={`°${unit}`} placeholder={`°${unit} on the display`} value={p.temp} onChange={(e) => setPoints(points.map((x, j) => (j === i ? { ...x, temp: e.target.value } : x)))} />
            <button className="btn-ghost px-3" aria-label="Remove" onClick={() => setPoints(points.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <div className="flex gap-2">
          <button className="btn-secondary flex-1" onClick={() => setPoints([...points, { time: '', temp: '' }])}>+ Add a point</button>
          {points.length > 0 && <button className="btn-ghost" onClick={() => setPoints([])}>Clear</button>}
        </div>
        <p className="muted text-xs">These are the Gene’s display (exhaust) temperatures, in °{unit}. A few points are enough: the line is drawn straight between them.</p>
      </div>

      <div className="card">
        <Field label="Notes">
          <textarea className="input min-h-16" value={note} onChange={(e) => setNote(e.target.value)} placeholder="what you’re trying, what to watch for…" />
        </Field>
      </div>

      <div className="flex gap-2">
        <button className="btn-primary flex-1" disabled={noSet} onClick={() => save(true)}>Save &amp; roast with it</button>
        <button className="btn-secondary" disabled={noSet} onClick={() => save(false)}>Save</button>
      </div>
      <button
        className="btn-ghost w-full text-sm"
        onClick={async () => setCopied((await copyText(planToCsv(plan, unit, beans.find((b) => b.id === beanId)?.name))) ? 'Plan copied as CSV' : 'Couldn’t copy')}
      >
        Copy this plan as CSV (to share or give to Claude)
      </button>
      {copied && <p className="text-center text-sm text-emerald-700 dark:text-emerald-400" role="status">{copied}</p>}
      {!isNew && (
        <button
          className="btn-ghost w-full text-red-700 dark:text-red-400"
          onClick={() => {
            if (confirm('Delete this plan? Roasts made with it are kept.')) {
              deletePlan(initial.id)
              navigate('/plans', { replace: true })
            }
          }}
        >
          Delete plan
        </button>
      )}
      <Link to="/guide" className="block text-center text-sm text-amber-700 underline dark:text-amber-400">Ideas: published Gene profiles are in the guide</Link>
    </div>
  )
}
