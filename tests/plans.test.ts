import { describe, expect, it } from 'vitest'
import { findPlan, nextPlanStep, planDropAt, planSetpointAt, planSetpoints, planTargetAt, type Plan } from '../src/knowledge/gene'
import { describeSteps, describeTargets, planAsCurve, planDataFromRoast, planFromRow, thinCurve, type PlanRow } from '../src/lib/plans'
import type { Roast } from '../src/lib/types'

const now = '2026-11-01T08:00:00.000Z'

const myPlan: Plan = planFromRow({
  id: 'p1',
  name: 'Brazil next',
  bean_id: null,
  data: {
    batch_g: 230,
    preheat_c: null,
    target_level: 'full_city',
    note: null,
    steps: [
      { when: 'fc', offset_s: 30, c: 233 },
      { when: 'start', c: 245 },
      { when: 'time', at_s: 300, c: 240 },
    ],
    curve: [{ t: 0, c: 120 }, { t: 300, c: 200 }, { t: 540, c: 220 }, { t: 690, c: 228 }],
    targets: { yellow_s: 270, fc_s: 540 },
    drop: { mode: 'dev', value: 150 },
  },
  created_at: now,
  updated_at: now,
} satisfies PlanRow)

describe('plan schedule', () => {
  it('works out the set temperature at any time, in time order', () => {
    expect(planSetpointAt(myPlan, 10, null)).toBe(245)
    expect(planSetpointAt(myPlan, 301, null)).toBe(240)
    expect(planSetpointAt(myPlan, 580, 560)).toBe(240) // 1st crack + 30 s (9:50) not reached yet
    expect(planSetpointAt(myPlan, 591, 560)).toBe(233)
  })

  it('orders upcoming steps using the planned first crack', () => {
    expect(nextPlanStep(myPlan, 10, null)).toEqual({ step: { when: 'time', at_s: 300, c: 240 }, at: 300 })
    expect(nextPlanStep(myPlan, 400, null)).toEqual({ step: { when: 'fc', offset_s: 30, c: 233 }, at: null })
    expect(nextPlanStep(myPlan, 400, 560)?.at).toBe(590)
    expect(nextPlanStep(myPlan, 600, 560)).toBeNull()
  })

  it('places the cool time from the real first crack', () => {
    expect(planDropAt(myPlan, null)).toBe(690) // planned 1st crack 9:00 + 2:30
    expect(planDropAt(myPlan, 600)).toBe(750) // real 1st crack 10:00 + 2:30
    expect(planDropAt({ ...myPlan, drop: { mode: 'dtr', value: 0.2 } }, 600)).toBe(750)
    expect(planDropAt({ ...myPlan, drop: { mode: 'time', value: 700 } }, 600)).toBe(700)
    expect(planDropAt({ ...myPlan, drop: null }, 600)).toBeNull()
  })

  it('interpolates the target curve and stays quiet outside it', () => {
    expect(planTargetAt(myPlan, 150)).toBe(160)
    expect(planTargetAt(myPlan, 800)).toBeNull()
  })

  it('draws as a curve with set temps and target milestones', () => {
    const c = planAsCurve(myPlan)
    expect(c.events.map((e) => `${e.type}@${e.t}`)).toEqual(['yellow@270', 'fc_start@540', 'drop@690'])
    expect(planSetpoints(myPlan, null)).toEqual([{ t: 0, c: 245 }, { t: 300, c: 240 }, { t: 570, c: 233 }])
  })

  it('describes itself in words, in either unit', () => {
    expect(describeSteps(myPlan, 'C')).toBe('245° from the start → 240° at 5:00 → 233° at 1st crack + 30 s')
    expect(describeSteps(myPlan, 'F')).toBe('473° from the start → 464° at 5:00 → 451° at 1st crack + 30 s')
    expect(describeTargets(myPlan)).toBe('yellow 4:30 · 1st crack 9:00 · cool 2:30 after 1st crack (11:30)')
  })

  it('still finds the built-in profiles', () => {
    expect(findPlan('rr-santos', [myPlan])?.name).toMatch(/Roast Rebels/)
    expect(findPlan('p1', [myPlan])?.mine).toBe(true)
  })
})

describe('plan from a roast', () => {
  const roast: Roast = {
    id: 'r1', bean_id: 'b1', roasted_at: now, batch_g: 230, roasted_g: 199, ambient_c: null, preheat_c: 175, brew: null, target_level: 'full_city',
    plan_id: null, reference_id: null,
    readings: [0, 20, 60, 90, 120, 180, 300, 540, 600, 660, 700].map((t, i) => ({ t, c: 120 + i * 10 })),
    setpoints: [{ t: 0, c: 243 }, { t: 400, c: 241 }, { t: 575, c: 233 }],
    events: [{ t: 290, type: 'yellow' }, { t: 560, type: 'fc_start' }, { t: 660, type: 'drop' }],
    level: 'city_plus', appearance: [], notes: null, created_at: now, updated_at: now,
  }

  it('turns dial changes near first crack into "at 1st crack" steps', () => {
    const d = planDataFromRoast(roast)
    expect(d.steps).toEqual([
      { when: 'start', c: 243 },
      { when: 'time', at_s: 400, c: 241 },
      { when: 'fc', offset_s: 15, c: 233 },
    ])
    expect(d.targets).toEqual({ yellow_s: 290, fc_s: 560 })
    expect(d.drop).toEqual({ mode: 'dev', value: 100 })
    expect(d.preheat_c).toBe(175)
    expect(d.target_level).toBe('city_plus')
  })

  it('uses the suggested cool time when given, and stops the curve at the old cool', () => {
    const d = planDataFromRoast(roast, 715)
    expect(d.drop).toEqual({ mode: 'dev', value: 155 })
    expect(d.curve.at(-1)?.t).toBe(660)
  })

  it('thins hand-logged readings but keeps the last one', () => {
    expect(thinCurve([{ t: 0, c: 1 }, { t: 10, c: 2 }, { t: 35, c: 3 }, { t: 50, c: 4 }]).map((p) => p.t)).toEqual([0, 35, 50])
  })
})
