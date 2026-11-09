import type { Bean, EndMethod, Roast, Tasting, Unit } from './types'
import { computeMetrics, setpointAt } from './metrics'
import { daysBetween, fmtDuration, fmtPct, fmtTemp, fmtTime, tempIn } from './format'
import { findOrigin } from '../knowledge/origins'
import { findProcess } from '../knowledge/processes'
import { findFlavour } from '../knowledge/flavours'
import { findLevel } from '../knowledge/roasting'
import { findPlan, planDropAt, planSetpointAt, planTargetAt, type Plan } from '../knowledge/gene'
import { describeSteps, describeTargets, planDataFromRoast, planFromRow } from './plans'
import { PLAN_CSV_SPEC, planToCsv } from './planCsv'
import { adviseTasting, type HistoryEntry } from './advice'

const eventNames: Record<string, string> = {
  yellow: 'Yellow (end of drying)',
  fc_start: 'First crack start',
  fc_end: 'First crack end',
  sc_start: 'Second crack start',
  drop: 'Drop (end of the roast)',
  colour: 'Colour',
  smell: 'Smell',
  note: 'Note',
}

const flavourList = (ids: string[]) => ids.map((id) => findFlavour(id)?.name ?? id).join(', ')
const slider = (v: number | null) => (v == null ? 'not rated' : v === 0 ? 'just right' : v < 0 ? `${-v} step${v < -1 ? 's' : ''} too little` : `${v} step${v > 1 ? 's' : ''} too much`)

export function beanText(bean: Bean): string {
  const origin = findOrigin(bean.country)
  const lines = [
    `- Name: ${bean.name}`,
    `- Origin: ${[origin?.name ?? bean.country, bean.region, bean.town].filter(Boolean).join(' / ') || 'unknown'}`,
    bean.producer && `- Producer: ${bean.producer}`,
    (bean.altitude_min || bean.altitude_max) && `- Altitude: ${[bean.altitude_min, bean.altitude_max].filter(Boolean).join('–')} masl`,
    bean.variety && `- Variety: ${bean.variety}`,
    bean.process && `- Process: ${findProcess(bean.process)?.name ?? bean.process}`,
    bean.grade && `- Grade: ${bean.grade}`,
    bean.harvest && `- Harvest: ${bean.harvest}`,
    bean.supplier && `- Supplier: ${bean.supplier}`,
    bean.seller_notes && `- Seller’s tasting notes: ${bean.seller_notes}`,
    bean.target_flavours.length && `- What I’m aiming for: ${flavourList(bean.target_flavours)}`,
    bean.notes && `- My notes: ${bean.notes}`,
  ]
  return lines.filter(Boolean).join('\n')
}

export function roastSummaryText(roast: Roast, unit: Unit, n?: number, plans: Plan[] = []): string {
  const m = computeMetrics(roast)
  const plan = findPlan(roast.plan_id, plans)
  const lines = [
    `- Date: ${new Date(roast.roasted_at).toLocaleString('en-GB')}${n ? ` (roast #${n})` : ''}`,
    roast.batch_g && `- Batch: ${roast.batch_g} g green${roast.roasted_g ? ` → ${roast.roasted_g} g roasted` : ''}${m.weightLossPct != null ? ` (weight loss ${m.weightLossPct.toFixed(1)}%)` : ''}`,
    roast.preheat_c && `- Preheat: ${fmtTemp(roast.preheat_c, unit)}`,
    roast.ambient_c != null && `- Room temperature: ${fmtTemp(roast.ambient_c, unit)}`,
    plan && `- Plan: ${plan.name} (details below)`,
    roast.brew && `- Roasted for: ${roast.brew}`,
    roast.target_level && `- Target level: ${findLevel(roast.target_level)?.name ?? roast.target_level}`,
    roast.level && `- Level judged at the end: ${findLevel(roast.level)?.name ?? roast.level}`,
    roast.appearance.length && `- Appearance: ${roast.appearance.join(', ')}`,
    `- Yellow: ${fmtTime(m.yellowS)} · First crack: ${fmtTime(m.fcS)} · FC end: ${fmtTime(m.fcEndS)} · Second crack: ${fmtTime(m.scS)} · Drop: ${fmtTime(m.dropS)}`,
    `- Development: ${m.devS != null ? fmtDuration(m.devS) : '–'} · DTR ${fmtPct(m.dtr, 1)} · Drying ${fmtPct(m.dryingPct)} · Maillard ${fmtPct(m.maillardPct)}`,
    `- Display at first crack: ${fmtTemp(m.tempAtFcC, unit)} · at drop: ${fmtTemp(m.tempAtDropC, unit)} · max: ${fmtTemp(m.maxTempC, unit)}`,
    roast.notes && `- Notes: ${roast.notes}`,
  ]
  return lines.filter(Boolean).join('\n')
}

/** The readings as CSV. With a plan, its target display and set temperature sit alongside. */
export function readingsCsv(roast: Roast, unit: Unit, plan?: Plan | null): string {
  const fcS = computeMetrics(roast).fcS
  const rows = [`time_s,time,display_${unit},set_${unit},${plan ? `plan_display_${unit},plan_set_${unit},` : ''}event`]
  const points = new Map<number, { c?: number; ev: string[] }>()
  for (const r of roast.readings) points.set(r.t, { ...(points.get(r.t) ?? { ev: [] }), c: r.c })
  for (const s of roast.setpoints) points.set(s.t, points.get(s.t) ?? { ev: [] })
  for (const e of roast.events) {
    const p = points.get(e.t) ?? { ev: [] }
    p.ev.push(`${eventNames[e.type] ?? e.type}${e.value ? `: ${e.value}` : ''}${e.note ? ` (${e.note})` : ''}`)
    points.set(e.t, p)
  }
  for (const t of [...points.keys()].sort((a, b) => a - b)) {
    const p = points.get(t)!
    const set = setpointAt(roast.setpoints, t)
    const planCols: (string | number)[] = []
    if (plan) {
      const target = planTargetAt(plan, t)
      const planSet = planSetpointAt(plan, t, fcS)
      planCols.push(target != null ? tempIn(target, unit) : '', planSet != null ? tempIn(planSet, unit) : '')
    }
    rows.push([Math.round(t), fmtTime(t), p.c != null ? tempIn(p.c, unit) : '', set != null ? tempIn(set, unit) : '', ...planCols, csvCell(p.ev.join('; '))].join(','))
  }
  return rows.join('\n')
}

function csvCell(s: string) {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function tastingText(t: Tasting, roast: Roast): string {
  const days = daysBetween(roast.roasted_at, t.tasted_on)
  return [
    `- ${t.tasted_on} (${days} day${days === 1 ? '' : 's'} after roasting)${t.brew ? `, ${t.brew}` : ''}${t.rating ? `, rating ${t.rating}/5` : ''}`,
    `  - Flavours: ${t.tags.length ? flavourList(t.tags) : 'none tagged'}`,
    `  - Acidity: ${slider(t.acidity)} · Sweetness: ${slider(t.sweetness)} · Body: ${slider(t.body)} · Bitterness: ${slider(t.bitterness)}`,
    t.wants.length ? `  - Next time I want: ${t.wants.join(', ').replace(/_/g, ' ')}` : '',
    t.notes ? `  - Notes: ${t.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Planned vs actual times, for the plan a roast was made with. */
export function planVsActual(plan: Plan, roast: Roast): string[] {
  const m = computeMetrics(roast)
  const diff = (planned: number | null | undefined, actual: number | null) => {
    if (planned == null) return null
    if (actual == null) return `planned ${fmtTime(planned)}, not logged`
    const d = Math.round(actual - planned)
    return `planned ${fmtTime(planned)}, actual ${fmtTime(actual)} (${d === 0 ? 'on time' : `${Math.abs(d)} s ${d > 0 ? 'later' : 'earlier'}`})`
  }
  const lines: string[] = []
  const y = diff(plan.targets?.yellow_s, m.yellowS)
  if (y) lines.push(`- Yellow: ${y}`)
  const f = diff(plan.targets?.fc_s, m.fcS)
  if (f) lines.push(`- First crack: ${f}`)
  const dropPlanned = planDropAt(plan, null)
  const dropForRealFc = planDropAt(plan, m.fcS)
  const dropTarget = dropForRealFc ?? dropPlanned
  if (dropTarget != null) {
    const moved = dropPlanned != null && dropForRealFc != null && dropPlanned !== dropForRealFc
    const d = m.dropS != null ? Math.round(m.dropS - dropTarget) : null
    const actual = m.dropS == null ? 'not logged' : `actual ${fmtTime(m.dropS)} (${d === 0 ? 'on time' : `${Math.abs(d!)} s ${d! > 0 ? 'later' : 'earlier'}`})`
    lines.push(`- Drop: planned ${fmtTime(dropTarget)}${moved ? ` (moved from ${fmtTime(dropPlanned)} to follow the real first crack)` : ''}, ${actual}`)
  }
  return lines
}

/** Everything about one roast, written so it can be pasted into a new Claude chat. */
export function roastForClaude(opts: {
  roast: Roast
  bean: Bean | null
  tastings: Tasting[]
  history: HistoryEntry[]
  unit: Unit
  n?: number
  plans?: Plan[]
  wantPlan?: boolean // ask Claude for a plan in the importable format
  ending?: EndMethod // how I end a roast (default: drop the beans and cool them myself)
}): string {
  const { roast, bean, tastings, history, unit, n, plans = [], wantPlan = false, ending = 'dump' } = opts
  const plan = findPlan(roast.plan_id, plans) ?? null
  const out: string[] = []
  out.push('# Home coffee roast: please help me improve the next one')
  out.push('')
  out.push('## My setup')
  out.push(
    [
      '- Roaster: Gene Café CBR-101 (hot-air drum, off-axis rotation, ~250 g max batch).',
      '- Controls: set temperature (max 250 °C / 482 °F) and a timer only. No fan or drum-speed control.',
      '- The temperature I log is the Gene’s display, which is the EXHAUST AIR temperature, not bean temperature. It runs well above the beans (one owner estimated 15–20 °C), so don’t compare it with bean-probe numbers. The trend is still meaningful.',
      ...(ending === 'gene'
        ? ['- I end the roast with the Gene’s cooling cycle, so the beans keep roasting a bit in the drum after I press cool.', '- Times are mm:ss from loading the beans. “Drop” means when I pressed cool.']
        : [
            '- I don’t use the Gene’s cooling cycle on the beans. To end the roast I stop the Gene, take the chamber out and tip the beans into a big sieve to cool them by hand (faster). Then I run the cooling cycle with the empty chamber to cool the machine.',
            '- Times are mm:ss from loading the beans. “Drop” means when I stopped the roast to tip the beans out.',
          ]),
    ].join('\n'),
  )
  out.push('')
  if (bean) {
    out.push('## The bean')
    out.push(beanText(bean))
    out.push('')
  }
  out.push('## This roast')
  out.push(roastSummaryText(roast, unit, n, plans))
  out.push('')
  out.push(`### Readings (${unit === 'C' ? '°C' : '°F'})${plan ? ', with the plan’s target display and set temperature alongside' : ''}`)
  out.push('```csv')
  out.push(readingsCsv(roast, unit, plan))
  out.push('```')
  out.push('')
  if (plan) {
    out.push('## The plan I roasted with')
    out.push(`- ${plan.name}${plan.mine ? ' (my own plan, as it is saved now)' : ` (a published Gene profile: ${plan.forWhat})`}`)
    const steps = describeSteps(plan, unit)
    if (steps) out.push(`- Set temperatures: ${steps}`)
    const targets = describeTargets(plan)
    if (targets) out.push(`- Targets: ${targets}`)
    if (plan.note) out.push(`- Plan notes: ${plan.note}`)
    out.push(...planVsActual(plan, roast))
    out.push('')
    out.push('The full plan, including its target curve:')
    out.push('```csv')
    out.push(planToCsv(plan, unit, bean?.name))
    out.push('```')
    out.push('')
  }
  if (tastings.length) {
    out.push('## How it tasted')
    for (const t of tastings) out.push(tastingText(t, roast))
    out.push('')
    const latest = [...tastings].sort((a, b) => b.tasted_on.localeCompare(a.tasted_on))[0]
    const advice = adviseTasting({ roast, bean, tasting: latest, history, unit, ending })
    out.push('## What my app suggested (rule-based, from roasting guides)')
    out.push(`- ${advice.headline}`)
    for (const i of advice.items) out.push(`- ${i.title}: ${i.body}`)
    out.push('')
  }
  if (history.length) {
    out.push('## My other roasts of this bean')
    out.push('| date | batch g | FC | drop | dev | DTR | loss % | level | best rating | flavours |')
    out.push('|---|---|---|---|---|---|---|---|---|---|')
    for (const h of [...history].sort((a, b) => a.roast.roasted_at.localeCompare(b.roast.roasted_at))) {
      const m = computeMetrics(h.roast)
      const ratings = h.tastings.map((t) => t.rating).filter((r): r is number => r != null)
      const tags = [...new Set(h.tastings.flatMap((t) => t.tags))]
      out.push(
        `| ${h.roast.roasted_at.slice(0, 10)} | ${h.roast.batch_g ?? ''} | ${fmtTime(m.fcS)} | ${fmtTime(m.dropS)} | ${m.devS != null ? fmtTime(m.devS) : '–'} | ${fmtPct(m.dtr)} | ${m.weightLossPct?.toFixed(1) ?? '–'} | ${findLevel(h.roast.level)?.name ?? '–'} | ${ratings.length ? Math.max(...ratings) : '–'} | ${flavourList(tags)} |`,
      )
    }
    out.push('')
  }
  out.push('## What I’d like')
  out.push(
    'Please research this origin/region/process and tell me what flavours it can give at its best, what my tasting notes say about this roast, and exactly what to change on my next roast on the Gene (set temperatures, when to change them, and when to drop, in mm:ss). Change one or two things at most, and tell me what to look for while it roasts.',
  )
  if (wantPlan) {
    // Your own plan (already shown above) has a curve and targets; otherwise write this roast
    // as a plan, so the example carries your real times and curve.
    const example = plan?.mine
      ? plan
      : planFromRow({ id: 'example', name: 'This roast as a plan', bean_id: null, data: planDataFromRoast(roast), created_at: roast.roasted_at, updated_at: roast.roasted_at })
    out.push('')
    out.push('## Please also give me a roast plan I can import')
    out.push(
      [
        'After your advice, write the complete plan for my next roast in the format below, so I can import it into my roasting app (Roastery → Plans → Import from Claude).',
        '- Put the whole plan in ONE ```csv code block, starting with the roastery_plan,v1 line. If you can make files, also give it to me as a downloadable .csv file.',
        `- Use °${unit} (unit row), times as m:ss from loading the beans, and the Gene’s DISPLAY temperatures, not bean temperatures.`,
        '- Base the times and the curve on my actual readings above (my machine, my power supply). Only change what you want me to do differently, and say above the block what changed and why.',
        '- Include curve rows every 30–60 s from 0:00 to the planned drop time, so I can see during the roast whether I’m ahead or behind.',
        '- Prefer set_at_fc and drop_after_fc for anything around first crack, because first crack moves from roast to roast.',
      ].join('\n'),
    )
    out.push('')
    out.push(PLAN_CSV_SPEC)
    out.push('')
    if (plan?.mine) out.push('Example: the plan I used for this roast, shown above, is in this format.')
    else {
      out.push('Example: this roast written as a plan, in that format:')
      out.push('```csv')
      out.push(planToCsv(example, unit, bean?.name))
      out.push('```')
    }
  }
  return out.join('\n')
}

/** One row per roast, for a spreadsheet. */
export function allRoastsCsv(roasts: Roast[], beans: Bean[], tastings: Tasting[], unit: Unit): string {
  const beanById = new Map(beans.map((b) => [b.id, b]))
  const header = [
    'roasted_at', 'bean', 'origin', 'process', 'batch_g', 'roasted_g', 'weight_loss_pct', 'preheat', 'yellow', 'first_crack', 'fc_end', 'second_crack', 'drop',
    'dev_s', 'dtr_pct', `display_at_fc_${unit}`, `display_at_drop_${unit}`, `max_set_${unit}`, 'level', 'best_rating', 'flavours', 'notes',
  ]
  const rows = [header.join(',')]
  for (const r of [...roasts].sort((a, b) => a.roasted_at.localeCompare(b.roasted_at))) {
    const m = computeMetrics(r)
    const b = r.bean_id ? beanById.get(r.bean_id) : undefined
    const ts = tastings.filter((t) => t.roast_id === r.id)
    const ratings = ts.map((t) => t.rating).filter((x): x is number => x != null)
    rows.push(
      [
        r.roasted_at, b?.name ?? '', findOrigin(b?.country)?.name ?? b?.country ?? '', findProcess(b?.process)?.name ?? b?.process ?? '',
        r.batch_g ?? '', r.roasted_g ?? '', m.weightLossPct?.toFixed(1) ?? '', r.preheat_c != null ? tempIn(r.preheat_c, unit) : '',
        fmtTime(m.yellowS), fmtTime(m.fcS), fmtTime(m.fcEndS), fmtTime(m.scS), fmtTime(m.dropS),
        m.devS != null ? Math.round(m.devS) : '', m.dtr != null ? (m.dtr * 100).toFixed(1) : '',
        m.tempAtFcC != null ? tempIn(m.tempAtFcC, unit) : '', m.tempAtDropC != null ? tempIn(m.tempAtDropC, unit) : '', m.maxSetC != null ? tempIn(m.maxSetC, unit) : '',
        findLevel(r.level)?.name ?? '', ratings.length ? Math.max(...ratings) : '', flavourList([...new Set(ts.flatMap((t) => t.tags))]), r.notes ?? '',
      ]
        .map((v) => csvCell(String(v)))
        .join(','),
    )
  }
  return rows.join('\n')
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Older browsers / insecure contexts: fall back to a hidden textarea.
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try { ok = document.execCommand('copy') } catch { ok = false }
    ta.remove()
    return ok
  }
}

export function downloadText(filename: string, text: string, type = 'text/csv') {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
