import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { defaultSettings, type Bean, type Roast, type Settings, type Tasting } from '../lib/types'
import { queueOp, type Op } from './outbox'
import { buildPublicRow, type MyShare, type ShareOptions } from '../lib/public'

// Offline-first store. Everything is kept in memory and in localStorage, and every change is
// queued in an "outbox" that's sent to Supabase as soon as there's a connection. So a roast
// logged in a garage with bad Wi-Fi is never lost; it just syncs later.

interface Snapshot {
  beans: Bean[]
  roasts: Roast[]
  tastings: Tasting[]
  settings: Settings
  shares: MyShare[] // your roasts that are in the public library
}

interface Store extends Snapshot {
  authReady: boolean
  session: Session | null
  loaded: boolean
  online: boolean
  pending: number
  syncError: string | null
  saveBean: (b: Bean) => void
  deleteBean: (id: string) => void
  saveRoast: (r: Roast) => void
  deleteRoast: (id: string) => void
  saveTasting: (t: Tasting) => void
  deleteTasting: (id: string) => void
  saveSettings: (s: Partial<Settings>) => void
  shareRoast: (roastId: string, opts: ShareOptions) => void
  unshareRoast: (roastId: string) => void
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const StoreContext = createContext<Store | null>(null)

const empty: Snapshot = { beans: [], roasts: [], tastings: [], settings: defaultSettings, shares: [] }
const cacheKey = (uid: string) => `roastery.cache.${uid}`
const outboxKey = (uid: string) => `roastery.outbox.${uid}`

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: the outbox still lives in memory for this session.
  }
}

const byRoastedDesc = (a: Roast, b: Roast) => b.roasted_at.localeCompare(a.roasted_at)

/** Apply queued (not yet synced) changes on top of rows fetched from the server. */
function applyOps(snap: Snapshot, ops: Op[]): Snapshot {
  let { beans, roasts, tastings, settings, shares } = snap
  for (const op of ops) {
    const upsert = <T extends { id: string }>(list: T[]) =>
      op.kind === 'delete' ? list.filter((x) => x.id !== op.id) : [...list.filter((x) => x.id !== op.id), op.row as unknown as T]
    if (op.table === 'roast_beans') beans = upsert(beans)
    if (op.table === 'roast_roasts') roasts = upsert(roasts)
    if (op.table === 'roast_tastings') tastings = upsert(tastings)
    if (op.table === 'roast_settings' && op.row) settings = { ...settings, ...(op.row.data as Partial<Settings>) }
    if (op.table === 'roast_public') {
      shares = shares.filter((x) => x.id !== op.id)
      if (op.kind === 'upsert' && op.row) {
        const r = op.row as unknown as MyShare
        shares = [...shares, { id: r.id, display_name: r.display_name, shares_notes: r.shares_notes, published_at: r.published_at }]
      }
    }
  }
  return { beans, roasts: [...roasts].sort(byRoastedDesc), tastings, settings, shares }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [authReady, setAuthReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [snap, setSnap] = useState<Snapshot>(empty)
  // The latest snapshot, readable synchronously (several queued changes can build on each other).
  const snapRef = useRef<Snapshot>(empty)
  const [loaded, setLoaded] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(0)
  const [syncError, setSyncError] = useState<string | null>(null)
  const outbox = useRef<Op[]>([])
  const flushing = useRef(false)
  const uid = session?.user.id ?? null

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const commit = useCallback(
    (next: Snapshot) => {
      snapRef.current = next
      setSnap(next)
      if (uid) writeJson(cacheKey(uid), next)
    },
    [uid],
  )

  const flush = useCallback(async () => {
    if (!uid || flushing.current) return
    flushing.current = true
    try {
      while (outbox.current.length) {
        const op = outbox.current[0]
        const q =
          op.kind === 'delete'
            ? supabase.from(op.table).delete().eq('id', op.id)
            : supabase.from(op.table).upsert({ ...op.row, ...(op.table === 'roast_settings' ? { id: uid } : { user_id: uid }) })
        const { error } = await q
        if (error) {
          // Network trouble (no Postgres error code): try again later. A real rejection is
          // dropped so it can't block everything behind it, but it's reported.
          const transient = !navigator.onLine || !error.code
          if (transient) break
          setSyncError(`${op.table.replace('roast_', '')}: ${error.message}`)
        } else {
          setSyncError(null)
        }
        // If the row was edited again while this request was in flight, the newer version took
        // its place in the queue: keep it, it goes out on the next loop.
        if (outbox.current[0] === op) outbox.current = outbox.current.slice(1)
        writeJson(outboxKey(uid), outbox.current)
        setPending(outbox.current.length)
      }
    } catch {
      // fetch threw (offline): leave the queue for next time
    } finally {
      flushing.current = false
    }
  }, [uid])

  const refresh = useCallback(async () => {
    if (!uid) return
    const [b, r, t, s, p] = await Promise.all([
      supabase.from('roast_beans').select('*'),
      supabase.from('roast_roasts').select('*').order('roasted_at', { ascending: false }),
      supabase.from('roast_tastings').select('*'),
      supabase.from('roast_settings').select('*').maybeSingle(),
      supabase.from('roast_public').select('id,display_name,shares_notes,published_at').eq('user_id', uid),
    ])
    if (b.error || r.error || t.error) return // offline or not reachable: keep the cache
    const server: Snapshot = {
      beans: b.data as Bean[],
      roasts: r.data as Roast[],
      tastings: t.data as Tasting[],
      settings: { ...defaultSettings, ...((s.data?.data as Partial<Settings>) ?? {}) },
      shares: p.error ? snapRef.current.shares : (p.data as MyShare[]),
    }
    commit(applyOps(server, outbox.current))
  }, [uid, commit])

  // Load cache + outbox for this account, then fetch fresh data.
  useEffect(() => {
    if (!uid) {
      snapRef.current = empty
      setSnap(empty)
      setLoaded(false)
      return
    }
    outbox.current = readJson<Op[]>(outboxKey(uid), [])
    setPending(outbox.current.length)
    const cached = readJson<Snapshot | null>(cacheKey(uid), null)
    if (cached) {
      commit({ ...cached, settings: { ...defaultSettings, ...cached.settings }, shares: cached.shares ?? [] })
      setLoaded(true)
    }
    flush().then(refresh).finally(() => setLoaded(true))
  }, [uid, flush, refresh, commit])

  useEffect(() => {
    if (!uid) return
    const retry = () => flush()
    window.addEventListener('online', retry)
    const timer = setInterval(retry, 30_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') flush().then(refresh)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', retry)
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [uid, flush, refresh])

  const enqueue = useCallback(
    (op: Op) => {
      if (!uid) return
      outbox.current = queueOp(outbox.current, op)
      writeJson(outboxKey(uid), outbox.current)
      setPending(outbox.current.length)
      commit(applyOps(snapRef.current, [op]))
      void flush()
    },
    [uid, flush, commit],
  )

  /** Rebuild the public copy of any of these roasts that are shared, from the latest data. */
  const republish = useCallback(
    (roastIds: string[]) => {
      const s = snapRef.current
      for (const id of new Set(roastIds)) {
        const share = s.shares.find((x) => x.id === id)
        const roast = s.roasts.find((r) => r.id === id)
        if (!share || !roast) continue
        const bean = s.beans.find((b) => b.id === roast.bean_id) ?? null
        const row = buildPublicRow(roast, bean, s.tastings.filter((t) => t.roast_id === id), {
          name: share.display_name,
          includeNotes: share.shares_notes,
          publishedAt: share.published_at,
        })
        enqueue({ table: 'roast_public', kind: 'upsert', id, row })
      }
    },
    [enqueue],
  )

  const store = useMemo<Store>(() => {
    const stamp = <T extends { updated_at: string }>(x: T): T => ({ ...x, updated_at: new Date().toISOString() })
    return {
      ...snap,
      authReady,
      session,
      loaded,
      online,
      pending,
      syncError,
      saveBean: (b) => {
        enqueue({ table: 'roast_beans', kind: 'upsert', id: b.id, row: stamp(b) as unknown as Record<string, unknown> })
        republish(snapRef.current.roasts.filter((r) => r.bean_id === b.id).map((r) => r.id))
      },
      deleteBean: (id) => enqueue({ table: 'roast_beans', kind: 'delete', id }),
      saveRoast: (r) => {
        enqueue({ table: 'roast_roasts', kind: 'upsert', id: r.id, row: stamp(r) as unknown as Record<string, unknown> })
        republish([r.id])
      },
      deleteRoast: (id) => {
        // Its tastings and public copy go too. The database would cascade, but deleting them
        // explicitly also cancels any of their uploads still waiting in the queue, which
        // would otherwise fail once the roast is gone.
        const s = snapRef.current
        for (const t of s.tastings.filter((x) => x.roast_id === id)) enqueue({ table: 'roast_tastings', kind: 'delete', id: t.id })
        if (s.shares.some((x) => x.id === id)) enqueue({ table: 'roast_public', kind: 'delete', id })
        enqueue({ table: 'roast_roasts', kind: 'delete', id })
      },
      saveTasting: (t) => {
        enqueue({ table: 'roast_tastings', kind: 'upsert', id: t.id, row: stamp(t) as unknown as Record<string, unknown> })
        republish([t.roast_id])
      },
      deleteTasting: (id) => {
        const roastId = snapRef.current.tastings.find((t) => t.id === id)?.roast_id
        enqueue({ table: 'roast_tastings', kind: 'delete', id })
        if (roastId) republish([roastId])
      },
      saveSettings: (s) => {
        const data = { ...snapRef.current.settings, ...s }
        enqueue({ table: 'roast_settings', kind: 'upsert', id: uid ?? 'me', row: { data, updated_at: new Date().toISOString() } })
      },
      shareRoast: (roastId, opts) => {
        const s = snapRef.current
        const roast = s.roasts.find((r) => r.id === roastId)
        if (!roast) return
        const bean = s.beans.find((b) => b.id === roast.bean_id) ?? null
        const existing = s.shares.find((x) => x.id === roastId)
        const row = buildPublicRow(roast, bean, s.tastings.filter((t) => t.roast_id === roastId), { ...opts, publishedAt: existing?.published_at })
        enqueue({ table: 'roast_public', kind: 'upsert', id: roastId, row })
      },
      unshareRoast: (roastId) => enqueue({ table: 'roast_public', kind: 'delete', id: roastId }),
      refresh,
      signOut: async () => {
        await supabase.auth.signOut()
      },
    }
  }, [snap, authReady, session, loaded, online, pending, syncError, enqueue, republish, refresh, uid])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const s = useContext(StoreContext)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}

/** Roast number (#1 = first ever) by date. */
export function useRoastNumbers(): Map<string, number> {
  const { roasts } = useStore()
  return useMemo(() => {
    const sorted = [...roasts].sort((a, b) => a.roasted_at.localeCompare(b.roasted_at))
    return new Map(sorted.map((r, i) => [r.id, i + 1]))
  }, [roasts])
}
