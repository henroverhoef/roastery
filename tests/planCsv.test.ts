import { describe, expect, it } from 'vitest'
import { parsePlanCsv, planToCsv } from '../src/lib/planCsv'
import { planFromRow, type PlanRow } from '../src/lib/plans'
import { readingsCsv, roastForClaude } from '../src/lib/export'
import type { Bean, Roast } from '../src/lib/types'

const now = '2026-11-01T08:00:00.000Z'
const row: PlanRow = {
  id: 'p1',
  name: 'Brazil: longer development',
  bean_id: 'b1',
  data: {
    batch_g: 230,
    preheat_c: 175,
    target_level: 'full_city',
    note: 'Cool later, more chocolate',
    steps: [
      { when: 'start', c: 243 },
      { when: 'time', at_s: 300, c: 240 },
      { when: 'fc', offset_s: 30, c: 233 },
    ],
    curve: [{ t: 0, c: 120 }, { t: 60, c: 150 }, { t: 540, c: 220 }, { t: 690, c: 228 }],
    targets: { yellow_s: 270, fc_s: 540 },
    drop: { mode: 'dev', value: 150 },
  },
  created_at: now,
  updated_at: now,
}
const plan = planFromRow(row)
const beans: Bean[] = [{
  id: 'b1', name: 'Brazil Cerrado Mineiro', country: 'brazil', region: null, town: null, producer: null, altitude_min: null, altitude_max: null, variety: null,
  process: 'natural', grade: null, harvest: null, supplier: null, price_per_kg: null, seller_notes: null, target_flavours: [], notes: null, archived: false,
  created_at: now, updated_at: now,
}]

describe('plan CSV', () => {
  it('round-trips a plan in °C', () => {
    const csv = planToCsv(plan, 'C', 'Brazil Cerrado Mineiro')
    expect(csv).toContain('\ndrop_after_fc,2:30,,')
    expect(csv.split('\n').slice(0, 2)).toEqual(['roastery_plan,v1', 'key,time,temp,value'])
    expect(csv).toContain('note,,,"Cool later, more chocolate"')
    const back = parsePlanCsv(csv, { unit: 'C', beans })
    expect(back.errors).toEqual([])
    expect(back.warnings).toEqual([])
    expect(back.name).toBe(row.name)
    expect(back.bean_id).toBe('b1')
    expect(back.data).toEqual(row.data)
  })

  it('round-trips through °F (to the nearest degree)', () => {
    const back = parsePlanCsv(planToCsv(plan, 'F'), { unit: 'C' })
    expect(back.data.steps.map((s) => Math.round(s.c))).toEqual([243, 240, 233])
    expect(Math.round(back.data.preheat_c!)).toBe(175)
    expect(back.data.curve.map((p) => Math.round(p.c))).toEqual([120, 150, 220, 228])
  })

  it('finds the plan inside a chatty Claude reply', () => {
    const reply = `Here's what I'd change: cool 30 s later.

\`\`\`csv
roastery_plan,v1
key,time,temp,value
name,,,Next Brazil, sweeter
unit,,,F
level,,,Full City+
batch_g,,,230
set_start,,470,
set_at_fc,0:45,451,
first_crack,9:15,,
cool_dtr,,,22%
curve,0:00,250,
curve,4:30,380,
curve,9:15,425,
mystery,1,2,3
\`\`\`

Let me know how it tastes!`
    const p = parsePlanCsv(reply, { unit: 'C' })
    expect(p.errors).toEqual([])
    expect(p.name).toBe('Next Brazil, sweeter')
    expect(p.data.target_level).toBe('full_city_plus')
    expect(Math.round(p.data.steps[0].c)).toBe(243)
    expect(p.data.steps[1]).toMatchObject({ when: 'fc', offset_s: 45 })
    expect(p.data.drop).toEqual({ mode: 'dtr', value: 0.22 })
    expect(p.data.curve).toHaveLength(3)
    expect(p.warnings).toEqual(['Skipped “mystery,1,2,3”: unknown row.'])
  })

  it('still reads the older cool_* rows', () => {
    const base = 'roastery_plan,v1\nkey,time,temp,value\nname,,,Old\nset_start,,245,\n'
    expect(parsePlanCsv(base + 'cool_after_fc,2:10,,', { unit: 'C' }).data.drop).toEqual({ mode: 'dev', value: 130 })
    expect(parsePlanCsv(base + 'drop_at,11:00,,', { unit: 'C' }).data.drop).toEqual({ mode: 'time', value: 660 })
    expect(parsePlanCsv(base + 'drop_dtr,,,21', { unit: 'C' }).data.drop).toEqual({ mode: 'dtr', value: 0.21 })
  })

  it('reads semicolon-separated files and warns about an unknown bean', () => {
    const p = parsePlanCsv('roastery_plan;v1\nkey;time;temp;value\nname;;;Semi\nunit;;;C\nbean;;;Kenya AA\nset_start;;245;\ncool_at;11:30;;', { unit: 'C', beans })
    expect(p.errors).toEqual([])
    expect(p.data.steps).toEqual([{ when: 'start', c: 245 }])
    expect(p.data.drop).toEqual({ mode: 'time', value: 690 })
    expect(p.bean_id).toBeNull()
    expect(p.warnings[0]).toMatch(/Kenya AA/)
  })

  it('explains what is missing', () => {
    expect(parsePlanCsv('hello there', { unit: 'C' }).errors[0]).toMatch(/No plan found/)
    expect(parsePlanCsv('roastery_plan,v1\nname,,,X\ncurve,0:00,100,', { unit: 'C' }).errors[0]).toMatch(/no set temperatures/)
  })
})

describe('Copy for Claude with a plan', () => {
  const roast: Roast = {
    id: 'r1', bean_id: 'b1', roasted_at: now, batch_g: 230, roasted_g: 199, ambient_c: null, preheat_c: 175, brew: null, target_level: 'full_city',
    plan_id: 'p1', reference_id: null,
    readings: [{ t: 0, c: 118 }, { t: 60, c: 148 }, { t: 540, c: 216 }, { t: 600, c: 221 }],
    setpoints: [{ t: 0, c: 243 }, { t: 300, c: 240 }, { t: 600, c: 233 }],
    events: [{ t: 290, type: 'yellow' }, { t: 570, type: 'fc_start' }, { t: 735, type: 'drop' }],
    level: 'city_plus', appearance: [], notes: null, created_at: now, updated_at: now,
  }

  it('puts the plan next to the actual readings', () => {
    const csv = readingsCsv(roast, 'C', plan)
    expect(csv.split('\n')[0]).toBe('time_s,time,display_C,set_C,plan_display_C,plan_set_C,event')
    expect(csv).toContain('60,1:00,148,243,150,243,')
    expect(csv).toContain('600,10:00,221,233,223,233,') // plan curve 220→228 between 9:00 and 11:30; set 233 from 1st crack 9:30 + 30 s
  })

  it('reports planned vs actual and includes the plan', () => {
    const text = roastForClaude({ roast, bean: beans[0], tastings: [], history: [], unit: 'C', plans: [plan] })
    expect(text).toContain('## The plan I roasted with')
    expect(text).toContain('- Yellow: planned 4:30, actual 4:50 (20 s later)')
    expect(text).toContain('- First crack: planned 9:00, actual 9:30 (30 s later)')
    expect(text).toContain('- Drop: planned 12:00 (moved from 11:30 to follow the real first crack), actual 12:15 (15 s later)')
    expect(text).not.toContain('Please also give me a roast plan')
  })

  it('says how I end a roast', () => {
    const dump = roastForClaude({ roast, bean: beans[0], tastings: [], history: [], unit: 'C' })
    expect(dump).toContain('tip the beans into a big sieve')
    expect(dump).toContain('“Drop” means when I stopped the roast to tip the beans out.')
    expect(dump).not.toContain('beans keep roasting a bit in the drum')
    const gene = roastForClaude({ roast, bean: beans[0], tastings: [], history: [], unit: 'C', ending: 'gene' })
    expect(gene).toContain('the beans keep roasting a bit in the drum after I press cool')
    expect(gene).toContain('“Drop” means when I pressed cool.')
  })

  it('asks for an importable plan, and its example imports cleanly', () => {
    const text = roastForClaude({ roast: { ...roast, plan_id: null }, bean: beans[0], tastings: [], history: [], unit: 'C', plans: [], wantPlan: true })
    expect(text).toContain('## Please also give me a roast plan I can import')
    expect(text).toContain('Roastery plan CSV format')
    const example = text.slice(text.lastIndexOf('roastery_plan,v1'))
    const p = parsePlanCsv(example, { unit: 'C', beans })
    expect(p.errors).toEqual([])
    expect(p.name).toBe('This roast as a plan')
    expect(p.data.targets).toEqual({ yellow_s: 290, fc_s: 570 })
    expect(p.data.drop).toEqual({ mode: 'dev', value: 165 })
    expect(p.data.curve.length).toBeGreaterThan(2)
  })
})
