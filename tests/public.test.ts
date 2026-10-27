import { describe, expect, it } from 'vitest'
import { buildPublicRow, publicBean, publicRoast, publicTastings, type PublicRow } from '../src/lib/public'
import type { Bean, Roast, Tasting } from '../src/lib/types'

const now = '2026-10-01T08:00:00.000Z'
const bean: Bean = {
  id: 'b1', name: 'Kenya Nyeri AA', country: 'kenya', region: 'Nyeri', town: 'Gatomboya', producer: 'Co-op', altitude_min: 1700, altitude_max: 1900,
  variety: 'SL28', process: 'washed', grade: 'AA', harvest: '2026', supplier: 'Bean shop', price_per_kg: 420, seller_notes: 'Blackcurrant',
  target_flavours: ['blackcurrant'], notes: 'Bought for my brother’s birthday', archived: false, created_at: now, updated_at: now,
}
const roast: Roast = {
  id: 'r1', bean_id: 'b1', roasted_at: now, batch_g: 250, roasted_g: 215, ambient_c: 20, preheat_c: null, brew: 'Filter / pour-over',
  target_level: 'city_plus', plan_id: 'sm-max', reference_id: 'r0',
  readings: [{ t: 0, c: 120 }, { t: 600, c: 222 }],
  setpoints: [{ t: 0, c: 250 }],
  events: [
    { t: 300, type: 'yellow' },
    { t: 540, type: 'fc_start', note: 'neighbour came over' },
    { t: 560, type: 'note', note: 'phone rang' },
    { t: 580, type: 'colour', value: 'medium_brown' },
    { t: 660, type: 'drop' },
  ],
  level: 'city_plus', appearance: ['even'], notes: 'Private roast note', created_at: now, updated_at: now,
}
const tastings: Tasting[] = [
  { id: 't2', roast_id: 'r1', tasted_on: '2026-10-08', brew: null, rating: 5, acidity: 0, sweetness: 0, body: 0, bitterness: 0, tags: ['blackcurrant', 'juicy'], wants: [], notes: 'Second note', created_at: now, updated_at: now },
  { id: 't1', roast_id: 'r1', tasted_on: '2026-10-04', brew: null, rating: 3, acidity: 1, sweetness: null, body: null, bitterness: null, tags: ['sour'], wants: ['less_sour'], notes: 'First note', created_at: now, updated_at: now },
]

describe('public library snapshot', () => {
  it('never shares the price, and leaves written notes out by default', () => {
    const row = buildPublicRow(roast, bean, tastings, { name: '  Henro  ', includeNotes: false })
    const json = JSON.stringify(row)
    expect(json).not.toContain('420')
    expect(json).not.toContain('price')
    for (const secret of ['Private roast note', 'phone rang', 'neighbour came over', 'birthday', 'First note', 'Second note']) expect(json).not.toContain(secret)
    expect(row.display_name).toBe('Henro')
    expect(row.shares_notes).toBe(false)
    // the events survive, minus free text
    expect(row.data.roast.events.map((e) => e.type)).toEqual(['yellow', 'fc_start', 'colour', 'drop'])
    expect(row.data.roast.events[2]).toEqual({ t: 580, type: 'colour', value: 'medium_brown' })
    // ids that point into the owner's private data aren't part of the snapshot
    expect(json).not.toContain('"r0"')
    expect(json).not.toContain('"b1"')
  })

  it('includes written notes only when asked', () => {
    const row = buildPublicRow(roast, bean, tastings, { name: 'Henro', includeNotes: true })
    const json = JSON.stringify(row)
    for (const note of ['Private roast note', 'phone rang', 'birthday', 'First note']) expect(json).toContain(note)
    expect(json).not.toContain('420')
  })

  it('summarises the roast for the library list', () => {
    const row = buildPublicRow(roast, bean, tastings, { name: 'Henro', includeNotes: false })
    expect(row.summary).toMatchObject({ bean_name: 'Kenya Nyeri AA', country: 'kenya', fc_s: 540, drop_s: 660, dev_s: 120, rating: 5, tastings: 2 })
    expect(row.summary.weight_loss).toBeCloseTo(14)
    expect(row.summary.tags).toEqual(['sour', 'blackcurrant', 'juicy']) // oldest tasting first
  })

  it('keeps the original publish date when the copy is refreshed', () => {
    const row = buildPublicRow(roast, bean, tastings, { name: 'Henro', includeNotes: false, publishedAt: '2026-10-02T00:00:00.000Z' })
    expect(row.published_at).toBe('2026-10-02T00:00:00.000Z')
    expect(row.updated_at).not.toBe(row.published_at)
  })

  it('round-trips into roast, bean and tastings for viewing', () => {
    const built = buildPublicRow(roast, bean, tastings, { name: 'Henro', includeNotes: false })
    const row: PublicRow = { ...built, user_id: 'u1' }
    const r = publicRoast(row)
    expect(r.readings).toEqual(roast.readings)
    expect(r.bean_id).toBeNull()
    expect(publicBean(row)?.price_per_kg).toBeNull()
    expect(publicTastings(row).map((t) => t.rating)).toEqual([3, 5])
  })

  it('works for a quick roast without a bean', () => {
    const row = buildPublicRow({ ...roast, bean_id: null }, null, [], { name: 'Henro', includeNotes: false })
    expect(row.bean_name).toBeNull()
    expect(row.data.bean).toBeNull()
    expect(row.summary.rating).toBeNull()
  })
})
