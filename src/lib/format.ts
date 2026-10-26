import type { Unit } from './types'

export const toF = (c: number) => (c * 9) / 5 + 32
export const toC = (f: number) => ((f - 32) * 5) / 9

/** A stored °C value in the unit the person uses, rounded to a whole degree. */
export function tempIn(c: number, unit: Unit): number {
  return Math.round(unit === 'F' ? toF(c) : c)
}

export function fmtTemp(c: number | null | undefined, unit: Unit): string {
  if (c == null || Number.isNaN(c)) return '–'
  return `${tempIn(c, unit)}°${unit}`
}

/** A temperature *difference* (e.g. a rate of rise) in the person's unit. */
export function deltaIn(dc: number, unit: Unit): number {
  return unit === 'F' ? (dc * 9) / 5 : dc
}

/** A temperature difference, e.g. "+12°C". */
export function fmtDelta(dc: number, unit: Unit): string {
  const v = Math.round(deltaIn(dc, unit))
  return `${v > 0 ? '+' : ''}${v}°${unit}`
}

/** 754 → "12:34" */
export function fmtTime(s: number | null | undefined): string {
  if (s == null || Number.isNaN(s)) return '–'
  const neg = s < 0
  const total = Math.round(Math.abs(s))
  const m = Math.floor(total / 60)
  const sec = total % 60
  return `${neg ? '−' : ''}${m}:${String(sec).padStart(2, '0')}`
}

/** 45 → "45 s", 95 → "1 min 35 s" */
export function fmtDuration(s: number): string {
  const total = Math.round(Math.abs(s))
  if (total < 60) return `${total} s`
  const m = Math.floor(total / 60)
  const sec = total % 60
  return sec ? `${m} min ${sec} s` : `${m} min`
}

export function fmtPct(x: number | null | undefined, digits = 0): string {
  if (x == null || Number.isNaN(x)) return '–'
  return `${(x * 100).toFixed(digits)}%`
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Today in the person's own timezone as yyyy-mm-dd. */
export function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Whole days from the roast to a tasting date (both in local time). */
export function daysBetween(roastedAt: string, tastedOn: string): number {
  const r = new Date(roastedAt)
  const roastDay = new Date(r.getFullYear(), r.getMonth(), r.getDate()).getTime()
  const [y, m, d] = tastedOn.split('-').map(Number)
  const tasteDay = new Date(y, m - 1, d).getTime()
  return Math.round((tasteDay - roastDay) / 86_400_000)
}

export function uid(): string {
  return crypto.randomUUID()
}
