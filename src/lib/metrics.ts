import type { EventType, Reading, Roast, RoastEvent, SetPoint } from './types'

export interface Metrics {
  totalS: number | null // charge → drop (or last reading if not dropped yet)
  yellowS: number | null
  fcS: number | null
  fcEndS: number | null
  scS: number | null
  dropS: number | null
  devS: number | null // first crack → drop
  dtr: number | null // devS / totalS
  dryingPct: number | null
  maillardPct: number | null
  weightLossPct: number | null
  maxTempC: number | null
  tempAtFcC: number | null
  tempAtDropC: number | null
  maxSetC: number | null
  setAtFcC: number | null
  setAfterFcC: number | null // last set temperature before the drop, if it changed after first crack
}

export function eventTime(events: RoastEvent[], type: EventType): number | null {
  const e = events.filter((x) => x.type === type).sort((a, b) => a.t - b.t)[0]
  return e ? e.t : null
}

/** Display temperature at time t, interpolated between readings. */
export function tempAt(readings: Reading[], t: number): number | null {
  if (!readings.length) return null
  const rs = [...readings].sort((a, b) => a.t - b.t)
  if (t <= rs[0].t) return rs[0].t === t ? rs[0].c : null
  for (let i = 1; i < rs.length; i++) {
    if (rs[i].t >= t) {
      const a = rs[i - 1]
      const b = rs[i]
      if (b.t === a.t) return b.c
      return a.c + ((b.c - a.c) * (t - a.t)) / (b.t - a.t)
    }
  }
  // Just after the last reading: use it if it's recent.
  const last = rs[rs.length - 1]
  return t - last.t <= 60 ? last.c : null
}

export function setpointAt(setpoints: SetPoint[], t: number): number | null {
  let c: number | null = null
  for (const s of [...setpoints].sort((a, b) => a.t - b.t)) if (s.t <= t) c = s.c
  return c
}

export function computeMetrics(roast: Pick<Roast, 'readings' | 'setpoints' | 'events' | 'batch_g' | 'roasted_g'>, nowS?: number): Metrics {
  const { readings, setpoints, events } = roast
  const yellowS = eventTime(events, 'yellow')
  const fcS = eventTime(events, 'fc_start')
  const fcEndS = eventTime(events, 'fc_end')
  const scS = eventTime(events, 'sc_start')
  const dropS = eventTime(events, 'drop')
  const lastReading = readings.length ? Math.max(...readings.map((r) => r.t)) : null
  const totalS = dropS ?? nowS ?? lastReading
  const devS = fcS != null && totalS != null && totalS >= fcS ? totalS - fcS : null
  const dtr = devS != null && totalS ? devS / totalS : null
  const dryingPct = yellowS != null && totalS ? yellowS / totalS : null
  const maillardPct = yellowS != null && fcS != null && totalS ? (fcS - yellowS) / totalS : null
  const weightLossPct =
    roast.batch_g && roast.roasted_g && roast.roasted_g < roast.batch_g
      ? ((roast.batch_g - roast.roasted_g) / roast.batch_g) * 100
      : null
  const upToDrop = readings.filter((r) => dropS == null || r.t <= dropS)
  const maxTempC = upToDrop.length ? Math.max(...upToDrop.map((r) => r.c)) : null
  const maxSetC = setpoints.length ? Math.max(...setpoints.map((s) => s.c)) : null
  const setAtFcC = fcS != null ? setpointAt(setpoints, fcS) : null
  const lastSet = dropS != null ? setpointAt(setpoints, dropS) : null
  return {
    totalS,
    yellowS,
    fcS,
    fcEndS,
    scS,
    dropS,
    devS,
    dtr,
    dryingPct,
    maillardPct,
    weightLossPct,
    maxTempC,
    tempAtFcC: fcS != null ? tempAt(readings, fcS) : null,
    tempAtDropC: dropS != null ? tempAt(readings, dropS) : null,
    maxSetC,
    setAtFcC,
    setAfterFcC: lastSet != null && setAtFcC != null && lastSet !== setAtFcC ? lastSet : null,
  }
}

export interface RorPoint {
  t: number
  ror: number // °C per minute
}

/**
 * Rate of rise from hand-logged readings. Each point compares a reading with the one at least
 * `minGap` seconds earlier (and no more than `maxGap`), so a quick double entry doesn't spike it.
 */
export function rateOfRise(readings: Reading[], minGap = 30, maxGap = 120): RorPoint[] {
  const rs = [...readings].sort((a, b) => a.t - b.t)
  const out: RorPoint[] = []
  for (let i = 1; i < rs.length; i++) {
    let j = i - 1
    while (j >= 0 && rs[i].t - rs[j].t < minGap) j--
    if (j < 0) continue
    const dt = rs[i].t - rs[j].t
    if (dt > maxGap) continue
    out.push({ t: rs[i].t, ror: ((rs[i].c - rs[j].c) / dt) * 60 })
  }
  return out
}

/** Drop time that gives a development time ratio `dtr` for a first crack at `fcS`. */
export function dropForDtr(fcS: number, dtr: number): number {
  return fcS / (1 - dtr)
}

/** Readings that rose less than `minRise` °C over `windowS` seconds before first crack: a stall. */
export function stallBeforeFc(readings: Reading[], fcS: number | null, windowS = 120): { from: number; to: number; rise: number } | null {
  if (fcS == null) return null
  const rs = [...readings].sort((a, b) => a.t - b.t).filter((r) => r.t <= fcS)
  if (rs.length < 2) return null
  const end = rs[rs.length - 1]
  const start = [...rs].reverse().find((r) => end.t - r.t >= windowS)
  if (!start) return null
  return { from: start.t, to: end.t, rise: end.c - start.c }
}
