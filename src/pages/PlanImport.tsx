import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../data/store'
import { Header } from '../components/ui'
import RoastChart from '../components/RoastChart'
import { PLAN_CSV_SPEC, parsePlanCsv } from '../lib/planCsv'
import { describeSteps, describeTargets, planAsCurve, planFromRow, type PlanRow } from '../lib/plans'
import { computeMetrics } from '../lib/metrics'
import { fmtPct, fmtTime, uid } from '../lib/format'

export default function PlanImport() {
  const { beans, settings, savePlan } = useStore()
  const navigate = useNavigate()
  const unit = settings.unit
  const [text, setText] = useState('')
  const [pasteError, setPasteError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const id = useMemo(() => uid(), [])

  const parsed = useMemo(() => (text.trim() ? parsePlanCsv(text, { unit, beans }) : null), [text, unit, beans])
  const now = new Date().toISOString()
  const row: PlanRow | null = parsed && !parsed.errors.length ? { id, name: parsed.name, bean_id: parsed.bean_id, data: parsed.data, created_at: now, updated_at: now } : null
  const plan = row ? planFromRow(row) : null
  const preview = plan ? planAsCurve(plan) : null
  const m = preview ? computeMetrics(preview) : null

  async function pasteFromClipboard() {
    setPasteError(null)
    try {
      setText(await navigator.clipboard.readText())
    } catch {
      setPasteError('The browser didn’t allow reading the clipboard. Long-press the box below and choose Paste instead.')
    }
  }

  function readFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result ?? ''))
    reader.readAsText(file)
  }

  function save(thenRoast: boolean) {
    if (!row) return
    savePlan(row)
    navigate(thenRoast ? `/roast/new?plan=${row.id}${row.bean_id ? `&bean=${row.bean_id}` : ''}` : `/plans/${row.id}`, { replace: true })
  }

  return (
    <div className="page space-y-4">
      <Header title="Import a plan" back="/plans" />
      <p className="muted -mt-2">
        Paste Claude’s reply (the whole thing is fine: the app finds the plan in it), or pick the .csv file Claude gave you. Use “Copy for Claude” with “ask for a roast plan” on a
        roast to get one.
      </p>

      <div className="card space-y-3">
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={pasteFromClipboard}>Paste from clipboard</button>
          <button className="btn-secondary" onClick={() => fileInput.current?.click()}>Choose a file…</button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) readFile(f)
              e.target.value = ''
            }}
          />
          {text && <button className="btn-ghost" onClick={() => setText('')}>Clear</button>}
        </div>
        {pasteError && <p className="text-sm text-amber-700 dark:text-amber-400">{pasteError}</p>}
        <textarea
          className="input min-h-40 font-mono text-xs"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'roastery_plan,v1\nkey,time,temp,value\nname,,,My next roast\n…'}
          aria-label="Plan text"
        />
      </div>

      {parsed && parsed.errors.length > 0 && (
        <div className="card border-l-4 border-red-600 text-sm">
          {parsed.errors.map((e) => <p key={e}>{e}</p>)}
        </div>
      )}

      {plan && preview && m && (
        <div className="card space-y-2">
          <h2 className="h2">{plan.name}</h2>
          {parsed?.beanName && <p className="muted">For: {parsed.beanName}{plan.bean_id ? '' : ' (not in your bean list)'}</p>}
          <RoastChart roast={preview} unit={unit} height={180} rorHeight={60} legendNames={{ display: 'Target display', set: 'Plan set temp' }} />
          <p className="text-sm">{describeSteps(plan, unit)}</p>
          {describeTargets(plan) && <p className="text-sm text-stone-600 dark:text-stone-400">Targets: {describeTargets(plan)}</p>}
          <p className="text-xs text-stone-500 tabular-nums">
            {plan.curve?.length ?? 0} curve points · drying {fmtPct(m.dryingPct)} · Maillard {fmtPct(m.maillardPct)} · development {m.devS != null ? fmtTime(m.devS) : '–'} · DTR {fmtPct(m.dtr, 1)}
          </p>
          {plan.note && <p className="text-sm whitespace-pre-wrap">{plan.note}</p>}
          {parsed && parsed.warnings.length > 0 && (
            <details className="text-xs text-amber-800 dark:text-amber-300">
              <summary className="cursor-pointer">{parsed.warnings.length} line{parsed.warnings.length === 1 ? '' : 's'} to check</summary>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">{parsed.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            </details>
          )}
          <div className="flex gap-2 pt-1">
            <button className="btn-primary flex-1" onClick={() => save(true)}>Save &amp; roast with it</button>
            <button className="btn-secondary" onClick={() => save(false)}>Save &amp; edit</button>
          </div>
        </div>
      )}

      <details className="card text-sm">
        <summary className="cursor-pointer font-semibold">The plan format (for writing one yourself)</summary>
        <pre className="mt-2 overflow-x-auto text-xs whitespace-pre-wrap">{PLAN_CSV_SPEC}</pre>
      </details>
    </div>
  )
}
