import { useSyncExternalStore } from 'react'
import type { EventType, Roast } from './types'

// The roast in progress. It lives in localStorage and is updated on every tap, so a reload,
// a locked phone or a flat battery mid-roast doesn't lose anything. The clock is derived from
// the start timestamp, so it keeps counting even while the page is in the background.

export type Curve = Pick<Roast, 'readings' | 'setpoints' | 'events' | 'batch_g' | 'roasted_g'>

export interface LiveState {
  roast: Roast
  startedAt: number // epoch ms when the beans went in
  log: ('r' | 's' | 'e')[] // order of entries, for undo
  follow?: { label: string; curve: Curve } // someone's public roast to roast along with
}

const KEY = 'roastery.live'

function read(): LiveState | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as LiveState) : null
  } catch {
    return null
  }
}

let state: LiveState | null = read()
const listeners = new Set<() => void>()

function set(next: LiveState | null) {
  state = next
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next))
    else localStorage.removeItem(KEY)
  } catch {
    // keep going in memory
  }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useLive(): LiveState | null {
  return useSyncExternalStore(subscribe, () => state)
}

export const elapsed = (s: LiveState, at = Date.now()) => Math.max(0, (at - s.startedAt) / 1000)
const round1 = (t: number) => Math.round(t * 10) / 10

export const live = {
  get: () => state,
  start(roast: Roast, startedAt = Date.now(), follow?: LiveState['follow']) {
    set({ roast, startedAt, log: [], ...(follow ? { follow } : {}) })
  },
  reading(c: number, t?: number) {
    if (!state) return
    const at = round1(t ?? elapsed(state))
    set({ ...state, roast: { ...state.roast, readings: [...state.roast.readings, { t: at, c }] }, log: [...state.log, 'r'] })
  },
  setpoint(c: number, t?: number) {
    if (!state) return
    const at = round1(t ?? elapsed(state))
    set({ ...state, roast: { ...state.roast, setpoints: [...state.roast.setpoints, { t: at, c }] }, log: [...state.log, 's'] })
  },
  event(type: EventType, value?: string, note?: string) {
    if (!state) return
    const at = round1(elapsed(state))
    const ev = { t: at, type, ...(value ? { value } : {}), ...(note ? { note } : {}) }
    set({ ...state, roast: { ...state.roast, events: [...state.roast.events, ev] }, log: [...state.log, 'e'] })
  },
  undo() {
    if (!state || !state.log.length) return
    const kind = state.log[state.log.length - 1]
    const r = state.roast
    const roast =
      kind === 'r' ? { ...r, readings: r.readings.slice(0, -1) } : kind === 's' ? { ...r, setpoints: r.setpoints.slice(0, -1) } : { ...r, events: r.events.slice(0, -1) }
    set({ ...state, roast, log: state.log.slice(0, -1) })
  },
  update(patch: Partial<Roast>) {
    if (!state) return
    set({ ...state, roast: { ...state.roast, ...patch } })
  },
  clear() {
    set(null)
  },
}

/** What the last undo would remove, for the button label. */
export function lastEntryLabel(s: LiveState | null): string | null {
  if (!s || !s.log.length) return null
  const kind = s.log[s.log.length - 1]
  if (kind === 'r') return 'reading'
  if (kind === 's') return 'set temp'
  const ev = s.roast.events[s.roast.events.length - 1]
  return ev ? ({ yellow: 'yellow', fc_start: '1st crack', fc_end: '1C end', sc_start: '2nd crack', drop: 'cool' } as Record<string, string>)[ev.type] ?? ev.type : 'event'
}
