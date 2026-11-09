import type { Plan, PlanDrop, PlanStep } from '../knowledge/gene'
import { planDropAt, planSetpoints, stepTime } from '../knowledge/gene'
import { computeMetrics } from './metrics'
import { fmtTime, tempIn } from './format'
import type { Roast, RoastEvent, Unit } from './types'

// "My plans": plans you design yourself, stored in roast_plans. A plan is a set-temperature
// schedule plus optional targets (yellow, first crack, when to drop) and a target curve.

export interface PlanData {
  batch_g: number | null
  preheat_c: number | null
  target_level: string | null
  note: string | null
  steps: PlanStep[]
  curve: { t: number; c: number }[]
  targets: { yellow_s: number | null; fc_s: number | null }
  drop: PlanDrop | null
}

export interface PlanRow {
  id: string
  name: string
  bean_id: string | null
  data: PlanData
  created_at: string
  updated_at: string
}

export function planFromRow(row: PlanRow): Plan {
  const d = row.data
  return {
    id: row.id,
    name: row.name,
    forWhat: 'Your own plan',
    note: d.note ?? '',
    sources: [],
    mine: true,
    bean_id: row.bean_id,
    batch_g: d.batch_g,
    preheat_c: d.preheat_c,
    target_level: d.target_level,
    steps: d.steps ?? [],
    curve: d.curve ?? [],
    targets: d.targets ?? { yellow_s: null, fc_s: null },
    drop: d.drop ?? null,
  }
}

export function emptyPlanData(): PlanData {
  return { batch_g: null, preheat_c: null, target_level: null, note: null, steps: [], curve: [], targets: { yellow_s: null, fc_s: null }, drop: null }
}

/** Thin hand-logged readings to roughly one point every `gap` seconds, keeping the first and last. */
export function thinCurve(points: { t: number; c: number }[], gap = 30): { t: number; c: number }[] {
  const pts = [...points].sort((a, b) => a.t - b.t)
  const out: { t: number; c: number }[] = []
  for (const p of pts) {
    if (!out.length || p.t - out[out.length - 1].t >= gap) out.push({ t: Math.round(p.t), c: Math.round(p.c * 10) / 10 })
  }
  const last = pts[pts.length - 1]
  if (last && out[out.length - 1].t !== Math.round(last.t)) out.push({ t: Math.round(last.t), c: Math.round(last.c * 10) / 10 })
  return out
}

/**
 * A plan that repeats a roast. Set-temperature changes made around first crack (from 30 s
 * before to 3 min after) become "at first crack + n s" steps, because that's how you'd repeat
 * them on the Gene. The drop is planned as time after first crack, unless `dropS` overrides it
 * (e.g. the advice's suggested drop time).
 */
export function planDataFromRoast(roast: Roast, dropS?: number | null): PlanData {
  const m = computeMetrics(roast)
  const fc = m.fcS
  const steps: PlanStep[] = [...roast.setpoints]
    .sort((a, b) => a.t - b.t)
    .map((sp, i) => {
      if (i === 0 && sp.t <= 5) return { when: 'start' as const, c: sp.c }
      if (fc != null && sp.t >= fc - 30 && sp.t <= fc + 180) return { when: 'fc' as const, offset_s: Math.max(0, Math.round(sp.t - fc)), c: sp.c }
      return { when: 'time' as const, at_s: Math.round(sp.t), c: sp.c }
    })
  const end = dropS ?? m.dropS
  const drop: PlanDrop | null = end == null ? null : fc != null ? { mode: 'dev', value: Math.max(0, Math.round(end - fc)) } : { mode: 'time', value: Math.round(end) }
  const upToDrop = roast.readings.filter((r) => m.dropS == null || r.t <= m.dropS)
  return {
    batch_g: roast.batch_g,
    preheat_c: roast.preheat_c,
    target_level: roast.level ?? roast.target_level,
    note: null,
    steps,
    curve: thinCurve(upToDrop),
    targets: { yellow_s: m.yellowS != null ? Math.round(m.yellowS) : null, fc_s: fc != null ? Math.round(fc) : null },
    drop,
  }
}

/** Draw a plan as if it were a roast: its curve, set-temperature schedule and target events. */
export function planAsCurve(plan: Plan, fcS: number | null = null) {
  const fc = fcS ?? plan.targets?.fc_s ?? null
  const events: RoastEvent[] = []
  if (plan.targets?.yellow_s != null) events.push({ t: plan.targets.yellow_s, type: 'yellow' })
  if (fc != null) events.push({ t: fc, type: 'fc_start' })
  const drop = planDropAt(plan, fc)
  if (drop != null) events.push({ t: drop, type: 'drop' })
  return {
    readings: plan.curve ?? [],
    setpoints: planSetpoints(plan, fc),
    events,
    batch_g: plan.batch_g ?? null,
    roasted_g: null,
  }
}

/** "245° from the start → 233° at 1st crack + 45 s → 230° at 12:00" */
export function describeSteps(plan: Plan, unit: Unit): string {
  const fc = plan.targets?.fc_s ?? null
  return [...plan.steps]
    .sort((a, b) => (stepTime(a, fc) ?? Infinity) - (stepTime(b, fc) ?? Infinity))
    .map((s) => {
      const temp = `${tempIn(s.c, unit)}°`
      if (s.when === 'start') return `${temp} from the start`
      if (s.when === 'time') return `${temp} at ${fmtTime(s.at_s ?? 0)}`
      return `${temp} at 1st crack${s.offset_s ? ` + ${s.offset_s} s` : ''}`
    })
    .join(' → ')
}

/** "yellow 4:30 · 1st crack 9:00 · drop 2:15 after 1st crack (11:15)" */
export function describeTargets(plan: Plan): string {
  const parts: string[] = []
  if (plan.targets?.yellow_s != null) parts.push(`yellow ${fmtTime(plan.targets.yellow_s)}`)
  if (plan.targets?.fc_s != null) parts.push(`1st crack ${fmtTime(plan.targets.fc_s)}`)
  const d = plan.drop
  if (d) {
    const at = planDropAt(plan, null)
    if (d.mode === 'time') parts.push(`drop at ${fmtTime(d.value)}`)
    else if (d.mode === 'dev') parts.push(`drop ${fmtTime(d.value)} after 1st crack${at != null ? ` (${fmtTime(at)})` : ''}`)
    else parts.push(`drop at ${Math.round(d.value * 1000) / 10}% DTR${at != null ? ` (${fmtTime(at)})` : ''}`)
  }
  return parts.join(' · ')
}
