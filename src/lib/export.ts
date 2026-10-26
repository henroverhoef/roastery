import type { Bean, Roast, Tasting, Unit } from './types'
import { computeMetrics, setpointAt } from './metrics'
import { daysBetween, fmtDuration, fmtPct, fmtTemp, fmtTime, tempIn } from './format'
import { findOrigin } from '../knowledge/origins'
import { findProcess } from '../knowledge/processes'
import { findFlavour } from '../knowledge/flavours'
import { findLevel } from '../knowledge/roasting'
import { findPlan } from '../knowledge/gene'
import { adviseTasting, type HistoryEntry } from './advice'

const eventNames: Record<string, string> = {
  yellow: 'Yellow (end of drying)',
  fc_start: 'First crack start',
  fc_end: 'First crack end',
  sc_start: 'Second crack start',
  drop: 'Cool pressed (drop)',
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

export function roastSummaryText(roast: Roast, unit: Unit, n?: number): string {
  const m = computeMetrics(roast)
  const plan = findPlan(roast.plan_id)
  const lines = [
    `- Date: ${new Date(roast.roasted_at).toLocaleString('en-GB')}${n ? ` (roast #${n})` : ''}`,
    roast.batch_g && `- Batch: ${roast.batch_g} g green${roast.roasted_g ? ` → ${roast.roasted_g} g roasted` : ''}${m.weightLossPct != null ? ` (weight loss ${m.weightLossPct.toFixed(1)}%)` : ''}`,
    roast.preheat_c && `- Preheat: ${fmtTemp(roast.preheat_c, unit)}`,
    roast.ambient_c != null && `- Room temperature: ${fmtTemp(roast.ambient_c, unit)}`,
    plan && `- Starting plan: ${plan.name}`,
    roast.brew && `- Roasted for: ${roast.brew}`,
    roast.target_level && `- Target level: ${findLevel(roast.target_level)?.name ?? roast.target_level}`,
    roast.level && `- Level judged at the end: ${findLevel(roast.level)?.name ?? roast.level}`,
    roast.appearance.length && `- Appearance: ${roast.appearance.join(', ')}`,
    `- Yellow: ${fmtTime(m.yellowS)} · First crack: ${fmtTime(m.fcS)} · FC end: ${fmtTime(m.fcEndS)} · Second crack: ${fmtTime(m.scS)} · Cool pressed: ${fmtTime(m.dropS)}`,
    `- Development: ${m.devS != null ? fmtDuration(m.devS) : '–'} · DTR ${fmtPct(m.dtr, 1)} · Drying ${fmtPct(m.dryingPct)} · Maillard ${fmtPct(m.maillardPct)}`,
    `- Display at first crack: ${fmtTemp(m.tempAtFcC, unit)} · at drop: ${fmtTemp(m.tempAtDropC, unit)} · max: ${fmtTemp(m.maxTempC, unit)}`,
    roast.notes && `- Notes: ${roast.notes}`,
  ]
  return lines.filter(Boolean).join('\n')
}

export function readingsCsv(roast: Roast, unit: Unit): string {
  const rows = [`time_s,time,display_${unit},set_${unit},event`]
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
    rows.push([Math.round(t), fmtTime(t), p.c != null ? tempIn(p.c, unit) : '', set != null ? tempIn(set, unit) : '', csvCell(p.ev.join('; '))].join(','))
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

/** Everything about one roast, written so it can be pasted into a new Claude chat. */
export function roastForClaude(opts: { roast: Roast; bean: Bean | null; tastings: Tasting[]; history: HistoryEntry[]; unit: Unit; n?: number }): string {
  const { roast, bean, tastings, history, unit, n } = opts
  const out: string[] = []
  out.push('# Home coffee roast: please help me improve the next one')
  out.push('')
  out.push('## My setup')
  out.push(
    [
      '- Roaster: Gene Café CBR-101 (hot-air drum, off-axis rotation, ~250 g max batch).',
      '- Controls: set temperature (max 250 °C / 482 °F) and a timer only. No fan or drum-speed control.',
      '- The temperature I log is the Gene’s display, which is the EXHAUST AIR temperature, not bean temperature. It runs well above the beans (one owner estimated 15–20 °C), so don’t compare it with bean-probe numbers. The trend is still meaningful.',
      '- The Gene keeps roasting a bit during its cooling cycle (beans stay in the drum).',
      '- Times are mm:ss from loading the beans. “Drop” means when I pressed cool.',
    ].join('\n'),
  )
  out.push('')
  if (bean) {
    out.push('## The bean')
    out.push(beanText(bean))
    out.push('')
  }
  out.push('## This roast')
  out.push(roastSummaryText(roast, unit, n))
  out.push('')
  out.push(`### Readings (${unit === 'C' ? '°C' : '°F'})`)
  out.push('```csv')
  out.push(readingsCsv(roast, unit))
  out.push('```')
  out.push('')
  if (tastings.length) {
    out.push('## How it tasted')
    for (const t of tastings) out.push(tastingText(t, roast))
    out.push('')
    const latest = [...tastings].sort((a, b) => b.tasted_on.localeCompare(a.tasted_on))[0]
    const advice = adviseTasting({ roast, bean, tasting: latest, history, unit })
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
    'Please research this origin/region/process and tell me what flavours it can give at its best, what my tasting notes say about this roast, and exactly what to change on my next roast on the Gene (set temperatures, when to change them, and when to press cool, in mm:ss). Change one or two things at most, and tell me what to look for while it roasts.',
  )
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
