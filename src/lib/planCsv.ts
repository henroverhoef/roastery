import type { Plan, PlanDrop, PlanStep } from '../knowledge/gene'
import { stepTime } from '../knowledge/gene'
import { roastLevels } from '../knowledge/roasting'
import { fmtTime, parseTime, tempIn, toC } from './format'
import { emptyPlanData, type PlanData } from './plans'
import type { Bean, Unit } from './types'

// "Roastery plan CSV": a plan as a plain CSV, one row per item, so Claude (or anyone) can write
// one and it can be imported under Plans → Import. Columns: key,time,temp,value.

export const PLAN_CSV_MARKER = 'roastery_plan,v1'

export const PLAN_CSV_SPEC = `Roastery plan CSV format (one row per item, columns key,time,temp,value):
- First line: roastery_plan,v1   Second line: key,time,temp,value
- Times are m:ss from loading the beans (e.g. 9:30). Temperatures are the Gene's DISPLAY (exhaust) temperatures, in the unit given by the unit row.
- name,,,<plan name>                      required
- unit,,,C                                C or F, for every temperature in the file
- bean,,,<bean name>                      optional, matched to my bean list by name
- batch_g,,,230                           optional, green weight in grams
- preheat,,175,                           optional, empty or missing = no preheat
- level,,,full_city                       optional: city, city_plus, full_city, full_city_plus, vienna or french
- note,,,"what this plan tries"            optional, quote text that contains commas
- set_start,,243,                         required: the Gene's set temperature at the start
- set_at,5:00,240,                        optional, repeatable: change the set temperature at a time
- set_at_fc,0:30,233,                     optional, repeatable: change it this long after first crack starts
- yellow,4:30,,                           optional: target time for yellow
- first_crack,9:00,,                      optional: target time for first crack
- drop_after_fc,2:30,,                    when to drop (end the roast), as time after first crack starts (preferred, it follows the real first crack)
  or drop_at,11:30,,                      at a fixed time
  or drop_dtr,,,22                        at a development time ratio in %
- curve,0:00,120,                         optional, repeatable: target display temperature points in time order (every 30–60 s is plenty)`

// ——— writing ———

const csvCell = (v: string | number | null | undefined) => {
  if (v == null) return ''
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const row = (key: string, time: string | null = null, temp: number | null = null, value: string | number | null = null) =>
  [key, time, temp, value].map(csvCell).join(',')

export function planToCsv(plan: Plan, unit: Unit, beanName?: string | null): string {
  const t = (c: number) => tempIn(c, unit)
  const lines = [PLAN_CSV_MARKER, 'key,time,temp,value', row('name', null, null, plan.name), row('unit', null, null, unit)]
  if (beanName) lines.push(row('bean', null, null, beanName))
  if (plan.batch_g) lines.push(row('batch_g', null, null, plan.batch_g))
  if (plan.preheat_c != null) lines.push(row('preheat', null, t(plan.preheat_c)))
  if (plan.target_level) lines.push(row('level', null, null, plan.target_level))
  if (plan.note) lines.push(row('note', null, null, plan.note))
  const fc = plan.targets?.fc_s ?? null
  for (const s of [...plan.steps].sort((a, b) => (stepTime(a, fc) ?? Infinity) - (stepTime(b, fc) ?? Infinity))) {
    if (s.when === 'start') lines.push(row('set_start', null, t(s.c)))
    else if (s.when === 'time') lines.push(row('set_at', fmtTime(s.at_s ?? 0), t(s.c)))
    else lines.push(row('set_at_fc', fmtTime(s.offset_s ?? 0), t(s.c)))
  }
  if (plan.targets?.yellow_s != null) lines.push(row('yellow', fmtTime(plan.targets.yellow_s)))
  if (plan.targets?.fc_s != null) lines.push(row('first_crack', fmtTime(plan.targets.fc_s)))
  const d = plan.drop
  if (d?.mode === 'dev') lines.push(row('drop_after_fc', fmtTime(d.value)))
  if (d?.mode === 'time') lines.push(row('drop_at', fmtTime(d.value)))
  if (d?.mode === 'dtr') lines.push(row('drop_dtr', null, null, Math.round(d.value * 1000) / 10))
  for (const p of [...(plan.curve ?? [])].sort((a, b) => a.t - b.t)) lines.push(row('curve', fmtTime(p.t), t(p.c)))
  return lines.join('\n')
}

// ——— reading ———

export interface ParsedPlan {
  name: string
  beanName: string | null
  bean_id: string | null
  data: PlanData
  warnings: string[]
  errors: string[]
}

/** The separator a line uses: comma, else semicolon (e.g. Excel in some locales), else tab. */
function delimiterOf(line: string): string {
  const outside = line.replace(/"[^"]*"/g, '')
  return outside.includes(',') ? ',' : outside.includes(';') ? ';' : outside.includes('\t') ? '\t' : ','
}

/** Split one CSV line, honouring "quoted, cells" and "" escapes. */
function splitCsv(line: string, delim: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === delim) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  out.push(cur.trim())
  return out
}

const KEY_ALIASES: Record<string, string> = {
  set_at_first_crack: 'set_at_fc',
  set_fc: 'set_at_fc',
  start: 'set_start',
  set: 'set_at',
  fc: 'first_crack',
  first_crack_at: 'first_crack',
  yellow_at: 'yellow',
  drop_after_first_crack: 'drop_after_fc',
  drop_time: 'drop_at',
  dtr: 'drop_dtr',
  // older files (and the Gene's own wording) say "cool"
  cool_after_fc: 'drop_after_fc',
  cool_after_first_crack: 'drop_after_fc',
  cool_at: 'drop_at',
  cool_time: 'drop_at',
  cool_dtr: 'drop_dtr',
  batch: 'batch_g',
  green_g: 'batch_g',
  target_level: 'level',
  point: 'curve',
}
const KNOWN = new Set(['name', 'unit', 'bean', 'batch_g', 'preheat', 'level', 'note', 'set_start', 'set_at', 'set_at_fc', 'yellow', 'first_crack', 'drop_after_fc', 'drop_at', 'drop_dtr', 'curve'])

function findLevel(v: string): string | null {
  const norm = v.toLowerCase().replace(/\+/g, '_plus').replace(/[\s-]+/g, '_').replace(/__+/g, '_')
  const hit = roastLevels.find((l) => l.id === norm || l.name.toLowerCase().replace(/\+/g, '_plus').replace(/[\s-]+/g, '_') === norm)
  return hit ? hit.id : null
}

const num = (s: string | undefined) => {
  if (s == null || s === '') return null
  const v = parseFloat(s.replace(',', '.').replace(/[^\d.+-]/g, ''))
  return Number.isFinite(v) ? v : null
}

/**
 * Read a plan from pasted text or a file. Tolerates a Claude reply around it: code fences,
 * text before the plan, comment lines starting with #. Unknown rows become warnings.
 */
export function parsePlanCsv(text: string, opts: { unit: Unit; beans?: Bean[] }): ParsedPlan {
  const warnings: string[] = []
  const errors: string[] = []
  let lines = text.replace(/\r/g, '').split('\n').map((l) => l.trim())
  const start = lines.findIndex((l) => l.toLowerCase().startsWith('roastery_plan'))
  if (start >= 0) lines = lines.slice(start + 1)
  else {
    const header = lines.findIndex((l) => /^key\s*[,;\t]/i.test(l))
    if (header >= 0) lines = lines.slice(header)
  }

  let cols = { key: 0, time: 1, temp: 2, value: 3 }
  const rows: { line: string; cells: string[]; delim: string }[] = []
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('```')) {
      if (rows.length) break // end of the code block
      continue
    }
    const delim = delimiterOf(line)
    const cells = splitCsv(line, delim)
    const first = cells[0].toLowerCase()
    if (first === 'key') {
      const idx = (name: string, fallback: number) => {
        const i = cells.findIndex((c) => c.toLowerCase().startsWith(name))
        return i >= 0 ? i : fallback
      }
      cols = { key: idx('key', 0), time: idx('time', 1), temp: idx('temp', 2), value: idx('value', 3) }
      continue
    }
    rows.push({ line, cells, delim })
  }

  const cell = (r: { cells: string[]; delim: string }, c: keyof typeof cols) => {
    // An unquoted comma in the last column (a name or note) shouldn't cut the text off.
    const last = Math.max(cols.key, cols.time, cols.temp, cols.value)
    if (c === 'value' && cols.value === last) {
      const rest = r.cells.slice(cols.value)
      while (rest.length > 1 && rest[rest.length - 1] === '') rest.pop()
      return rest.join(r.delim === '\t' ? ' ' : `${r.delim} `).trim()
    }
    return r.cells[cols[c]] ?? ''
  }
  const keyOf = (r: { cells: string[]; delim: string }) => {
    const k = cell(r, 'key').toLowerCase().replace(/[\s-]+/g, '_')
    return KEY_ALIASES[k] ?? k
  }

  const unitRow = rows.find((r) => keyOf(r) === 'unit')
  const unitText = unitRow ? (cell(unitRow, 'value') || cell(unitRow, 'temp') || cell(unitRow, 'time')).toUpperCase() : ''
  const unit: Unit = unitText.includes('F') ? 'F' : unitText.includes('C') ? 'C' : opts.unit
  if (!unitRow) warnings.push(`No unit row: read the temperatures as °${unit}.`)
  const toStored = (v: number) => (unit === 'F' ? toC(v) : v)

  const data: PlanData = emptyPlanData()
  let name = ''
  let beanName: string | null = null
  const steps: PlanStep[] = []
  const curve = new Map<number, number>()

  for (const r of rows) {
    const key = keyOf(r)
    const time = parseTime(cell(r, 'time'))
    const temp = num(cell(r, 'temp'))
    const value = cell(r, 'value')
    const bad = (why: string) => warnings.push(`Skipped “${r.line}”: ${why}.`)
    if (!KNOWN.has(key)) {
      bad('unknown row')
      continue
    }
    switch (key) {
      case 'name':
        name = (value || cell(r, 'time')).slice(0, 80)
        break
      case 'unit':
        break
      case 'bean':
        beanName = value || null
        break
      case 'batch_g': {
        const v = num(value) ?? num(cell(r, 'temp'))
        if (v != null && v > 0) data.batch_g = v
        else bad('no weight')
        break
      }
      case 'preheat':
        if (temp != null) data.preheat_c = toStored(temp)
        break
      case 'level': {
        const l = findLevel(value || cell(r, 'time'))
        if (l) data.target_level = l
        else bad('unknown roast level')
        break
      }
      case 'note':
        data.note = value || null
        break
      case 'set_start':
        if (temp == null) bad('no temperature')
        else steps.push({ when: 'start', c: toStored(temp) })
        break
      case 'set_at':
        if (temp == null || time == null) bad('needs a time and a temperature')
        else if (time === 0) steps.push({ when: 'start', c: toStored(temp) })
        else steps.push({ when: 'time', at_s: Math.round(time), c: toStored(temp) })
        break
      case 'set_at_fc':
        if (temp == null) bad('no temperature')
        else steps.push({ when: 'fc', offset_s: Math.max(0, Math.round(time ?? 0)), c: toStored(temp) })
        break
      case 'yellow':
        if (time == null) bad('no time')
        else data.targets.yellow_s = Math.round(time)
        break
      case 'first_crack':
        if (time == null) bad('no time')
        else data.targets.fc_s = Math.round(time)
        break
      case 'drop_after_fc':
      case 'drop_at': {
        if (time == null) bad('no time')
        else data.drop = { mode: key === 'drop_at' ? 'time' : 'dev', value: Math.round(time) } satisfies PlanDrop
        break
      }
      case 'drop_dtr': {
        let v = num(value) ?? num(cell(r, 'temp'))
        if (v != null && v > 1) v = v / 100
        if (v == null || v <= 0 || v >= 1) bad('DTR must be a percentage between 0 and 100')
        else data.drop = { mode: 'dtr', value: v }
        break
      }
      case 'curve':
        if (time == null || temp == null) bad('needs a time and a temperature')
        else curve.set(Math.round(time), Math.round(toStored(temp) * 10) / 10)
        break
    }
  }

  data.steps = steps
  data.curve = [...curve.entries()].sort((a, b) => a[0] - b[0]).map(([t, c]) => ({ t, c }))
  if (!rows.some((r) => KNOWN.has(keyOf(r)))) errors.push('No plan found. Paste the whole CSV block that starts with roastery_plan,v1.')
  else if (!steps.length) errors.push('The plan has no set temperatures (a set_start row is required).')
  if (steps.length && !steps.some((s) => s.when === 'start')) warnings.push('No set_start row: the plan doesn’t say what to set the Gene to at the start.')

  const bean = beanName ? opts.beans?.find((b) => b.name.trim().toLowerCase() === beanName!.trim().toLowerCase()) : undefined
  if (beanName && !bean) warnings.push(`No bean called “${beanName}” in your list: the plan is saved for any bean.`)
  return { name: name || 'Plan from Claude', beanName, bean_id: bean?.id ?? null, data, warnings, errors }
}
