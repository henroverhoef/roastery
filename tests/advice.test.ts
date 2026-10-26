import { describe, expect, it } from 'vitest'
import { adviseTasting } from '../src/lib/advice'
import { computeMetrics, dropForDtr, rateOfRise, tempAt } from '../src/lib/metrics'
import { fmtTime, tempIn, toC } from '../src/lib/format'
import type { Bean, Roast, Tasting } from '../src/lib/types'
import { origins } from '../src/knowledge/origins'
import { flavours } from '../src/knowledge/flavours'
import { sources } from '../src/knowledge/sources'
import { plans, planSetpointAt } from '../src/knowledge/gene'
import { processes } from '../src/knowledge/processes'
import { varieties } from '../src/knowledge/varieties'
import { readingsCsv, roastForClaude } from '../src/lib/export'

const now = '2026-10-01T08:00:00.000Z'

function bean(over: Partial<Bean> = {}): Bean {
  return {
    id: 'b1', name: 'Test bean', country: 'brazil', region: null, town: null, producer: null, altitude_min: null, altitude_max: null,
    variety: null, process: 'natural', grade: null, harvest: null, supplier: null, price_per_kg: null, seller_notes: null,
    target_flavours: [], notes: null, archived: false, created_at: now, updated_at: now, ...over,
  }
}

function roast(over: Partial<Roast> = {}): Roast {
  return {
    id: 'r1', bean_id: 'b1', roasted_at: now, batch_g: 250, roasted_g: 220, ambient_c: 22, preheat_c: null, brew: 'Filter / pour-over',
    target_level: null, plan_id: null, reference_id: null,
    readings: [
      { t: 0, c: 80 }, { t: 60, c: 120 }, { t: 120, c: 150 }, { t: 240, c: 180 }, { t: 360, c: 200 }, { t: 480, c: 212 }, { t: 570, c: 220 }, { t: 660, c: 226 },
    ],
    setpoints: [{ t: 0, c: 245 }],
    events: [
      { t: 300, type: 'yellow' },
      { t: 570, type: 'fc_start' },
      { t: 660, type: 'drop' },
    ],
    level: 'city', appearance: ['even'], notes: null, created_at: now, updated_at: now, ...over,
  }
}

function tasting(over: Partial<Tasting> = {}): Tasting {
  return {
    id: 't1', roast_id: 'r1', tasted_on: '2026-10-05', brew: 'Filter / pour-over', rating: 3, acidity: 0, sweetness: 0, body: 0, bitterness: 0,
    tags: [], wants: [], notes: null, created_at: now, updated_at: now, ...over,
  }
}

describe('metrics', () => {
  it('computes phases, development and DTR', () => {
    const m = computeMetrics(roast())
    expect(m.totalS).toBe(660)
    expect(m.devS).toBe(90)
    expect(m.dtr).toBeCloseTo(90 / 660)
    expect(m.dryingPct).toBeCloseTo(300 / 660)
    expect(m.maillardPct).toBeCloseTo(270 / 660)
    expect(m.weightLossPct).toBeCloseTo(12)
    expect(m.tempAtFcC).toBe(220)
  })

  it('finds the drop time for a target DTR', () => {
    expect(dropForDtr(600, 0.2)).toBe(750)
    expect(fmtTime(dropForDtr(570, 0.2))).toBe('11:53')
  })

  it('calculates rate of rise per minute, skipping too-close readings', () => {
    const ror = rateOfRise([{ t: 0, c: 100 }, { t: 10, c: 101 }, { t: 60, c: 110 }, { t: 120, c: 116 }])
    expect(ror[0]).toEqual({ t: 60, ror: (110 - 101) / 50 * 60 })
    expect(ror[1].ror).toBeCloseTo(6)
  })

  it('interpolates the display temperature', () => {
    expect(tempAt([{ t: 0, c: 100 }, { t: 60, c: 160 }], 30)).toBe(130)
  })

  it('round-trips °F through storage', () => {
    for (const f of [446, 455, 464, 473, 482, 401, 399]) expect(tempIn(toC(f), 'F')).toBe(f)
  })
})

describe('advice', () => {
  it('Brazil that tastes grassy and nutty → drop later, sized to a 20% DTR', () => {
    const a = adviseTasting({ roast: roast(), bean: bean(), tasting: tasting({ tags: ['grassy', 'nutty'] }), history: [], unit: 'C' })
    expect(a.direction).toBe(1)
    const main = a.items.find((i) => i.tone === 'change')!
    expect(main.title).toBe('Drop about 55 s later (at 11:53)')
    expect(a.items.some((i) => i.id === 'origin-light' && /Full City/.test(i.body))).toBe(true)
    expect(a.headline).toMatch(/Develop it further/)
  })

  it('Brazil that is just nutty but aiming for chocolate → still nudges darker', () => {
    const a = adviseTasting({ roast: roast(), bean: bean({ target_flavours: ['chocolate'] }), tasting: tasting({ tags: ['nutty'] }), history: [], unit: 'C' })
    expect(a.direction).toBe(1)
  })

  it('washed Ethiopian tasting roasty and chocolatey → pull back', () => {
    const r = roast({
      events: [{ t: 300, type: 'yellow' }, { t: 540, type: 'fc_start' }, { t: 760, type: 'drop' }],
      level: 'full_city',
    })
    const a = adviseTasting({ roast: r, bean: bean({ country: 'ethiopia', process: 'washed' }), tasting: tasting({ tags: ['dark_choc', 'roasty'], bitterness: 1 }), history: [], unit: 'C' })
    expect(a.direction).toBe(-1)
    const main = a.items.find((i) => i.tone === 'change')!
    expect(main.title).toMatch(/earlier \(at 12:00\)/)
    expect(a.items.some((i) => i.id === 'origin-dark')).toBe(true)
  })

  it('ashy in a light roast → too much heat early, not "drop earlier"', () => {
    const a = adviseTasting({ roast: roast(), bean: bean({ country: 'kenya', process: 'washed' }), tasting: tasting({ tags: ['ashy', 'citrus'] }), history: [], unit: 'C' })
    expect(a.items.some((i) => i.id === 'scorch')).toBe(true)
    expect(a.direction).not.toBe(-1)
  })

  it('a great cup with no defects → keep the profile', () => {
    const a = adviseTasting({ roast: roast(), bean: bean(), tasting: tasting({ rating: 5, tags: ['chocolate', 'caramel'] }), history: [], unit: 'C' })
    expect(a.items[0].id).toBe('keep')
  })

  it('points at the best earlier roast of the same bean', () => {
    const better = roast({ id: 'r0', roasted_at: '2026-09-20T08:00:00.000Z', events: [{ t: 300, type: 'yellow' }, { t: 570, type: 'fc_start' }, { t: 720, type: 'drop' }] })
    const a = adviseTasting({
      roast: roast(), bean: bean(), tasting: tasting({ tags: ['grassy'] }),
      history: [{ roast: better, tastings: [tasting({ id: 't0', roast_id: 'r0', rating: 5 })] }], unit: 'C',
    })
    const h = a.items.find((i) => i.id === 'history')!
    expect(h.body).toMatch(/1 min more development/)
  })

  it('warns when a light roast is tasted too fresh', () => {
    const a = adviseTasting({ roast: roast(), bean: bean(), tasting: tasting({ tasted_on: '2026-10-01', tags: ['sour'] }), history: [], unit: 'C' })
    expect(a.items.some((i) => i.id === 'rest-min')).toBe(true)
  })

  it('without first crack it asks you to log it', () => {
    const a = adviseTasting({ roast: roast({ events: [{ t: 660, type: 'drop' }] }), bean: bean(), tasting: tasting({ tags: ['grassy'] }), history: [], unit: 'C' })
    expect(a.items.find((i) => i.tone === 'change')!.body).toMatch(/First crack wasn’t logged/)
  })
})

describe('knowledge base integrity', () => {
  const flavourIds = new Set(flavours.map((f) => f.id))
  const sourceIds = new Set(Object.keys(sources))
  it('origins only use known flavours and sources', () => {
    for (const o of origins) {
      for (const f of [...o.flavours, ...o.best]) expect(flavourIds.has(f), `${o.id}: ${f}`).toBe(true)
      for (const s of o.sources) expect(sourceIds.has(s), `${o.id}: ${s}`).toBe(true)
      for (const b of o.best) expect(o.flavours.includes(b), `${o.id} best ${b} not in flavours`).toBe(true)
    }
  })
  it('plans, processes and varieties cite known sources', () => {
    for (const x of [...plans, ...processes, ...varieties]) for (const s of x.sources) expect(sourceIds.has(s), `${x.id}: ${s}`).toBe(true)
  })
  it('plans give the right set temperature after first crack', () => {
    const shb = plans.find((p) => p.id === 'rr-shb')!
    expect(planSetpointAt(shb, 100, null)).toBe(245)
    expect(planSetpointAt(shb, 600, 570)).toBe(245)
    expect(planSetpointAt(shb, 620, 570)).toBe(225)
  })
})

describe('export', () => {
  it('writes readings CSV with set temperatures and events', () => {
    const csv = readingsCsv(roast(), 'C')
    expect(csv.split('\n')[0]).toBe('time_s,time,display_C,set_C,event')
    expect(csv).toContain('570,9:30,220,245,First crack start')
  })
  it('builds a Claude-ready text with context and history', () => {
    const text = roastForClaude({ roast: roast(), bean: bean(), tastings: [tasting({ tags: ['grassy'] })], history: [], unit: 'C' })
    expect(text).toContain('EXHAUST AIR temperature')
    expect(text).toContain('## What my app suggested')
    expect(text).toContain('Drop about 55 s later')
  })
})
