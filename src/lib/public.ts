import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { computeMetrics } from './metrics'
import type { Bean, Roast, Tasting } from './types'

// The public library: snapshots of roasts that people chose to share. A snapshot holds the
// curve, the bean (never the price) and the tastings. Written notes are only included when
// the roaster ticks "include my written notes".

export interface PublicBean {
  name: string
  country: string | null
  region: string | null
  town: string | null
  producer: string | null
  altitude_min: number | null
  altitude_max: number | null
  variety: string | null
  process: string | null
  grade: string | null
  harvest: string | null
  supplier: string | null
  seller_notes: string | null
  target_flavours: string[]
  notes: string | null
}

export type PublicTasting = Omit<Tasting, 'id' | 'roast_id' | 'created_at' | 'updated_at'>

export interface PublicData {
  version: 1
  roast: Omit<Roast, 'id' | 'bean_id' | 'reference_id' | 'created_at' | 'updated_at'>
  bean: PublicBean | null
  tastings: PublicTasting[]
}

export interface PublicSummary {
  bean_name: string | null
  country: string | null
  region: string | null
  town: string | null
  altitude_min: number | null
  altitude_max: number | null
  variety: string | null
  process: string | null
  roasted_at: string
  batch_g: number | null
  level: string | null
  brew: string | null
  fc_s: number | null
  drop_s: number | null
  dev_s: number | null
  dtr: number | null
  weight_loss: number | null
  rating: number | null
  tags: string[]
  tastings: number
}

export interface PublicRow {
  id: string
  user_id: string
  display_name: string
  bean_name: string | null
  country: string | null
  process: string | null
  shares_notes: boolean
  summary: PublicSummary
  data?: PublicData
  published_at: string
  updated_at: string
}

/** What the store remembers about your own shared roasts. */
export interface MyShare {
  id: string
  display_name: string
  shares_notes: boolean
  published_at: string
}

export interface ShareOptions {
  name: string
  includeNotes: boolean
  publishedAt?: string
}

/** The row to upsert into roast_public (user_id is added when it's sent). */
export function buildPublicRow(roast: Roast, bean: Bean | null, tastings: Tasting[], opts: ShareOptions) {
  const notes = opts.includeNotes
  const m = computeMetrics(roast)
  const ratings = tastings.map((t) => t.rating).filter((r): r is number => r != null)
  const sortedTastings = [...tastings].sort((a, b) => a.tasted_on.localeCompare(b.tasted_on))
  const data: PublicData = {
    version: 1,
    roast: {
      roasted_at: roast.roasted_at,
      batch_g: roast.batch_g,
      roasted_g: roast.roasted_g,
      ambient_c: roast.ambient_c,
      preheat_c: roast.preheat_c,
      brew: roast.brew,
      target_level: roast.target_level,
      plan_id: roast.plan_id,
      readings: roast.readings,
      setpoints: roast.setpoints,
      // Free-text notes typed during the roast only go out when notes are shared.
      events: roast.events
        .filter((e) => notes || e.type !== 'note')
        .map((e) => (notes || !e.note ? e : { t: e.t, type: e.type, ...(e.value ? { value: e.value } : {}) })),
      level: roast.level,
      appearance: roast.appearance,
      notes: notes ? roast.notes : null,
    },
    bean: bean
      ? {
          name: bean.name,
          country: bean.country,
          region: bean.region,
          town: bean.town,
          producer: bean.producer,
          altitude_min: bean.altitude_min,
          altitude_max: bean.altitude_max,
          variety: bean.variety,
          process: bean.process,
          grade: bean.grade,
          harvest: bean.harvest,
          supplier: bean.supplier,
          seller_notes: bean.seller_notes,
          target_flavours: bean.target_flavours,
          notes: notes ? bean.notes : null,
        }
      : null,
    tastings: sortedTastings.map((t) => ({
      tasted_on: t.tasted_on,
      brew: t.brew,
      rating: t.rating,
      acidity: t.acidity,
      sweetness: t.sweetness,
      body: t.body,
      bitterness: t.bitterness,
      tags: t.tags,
      wants: t.wants,
      notes: notes ? t.notes : null,
    })),
  }
  const summary: PublicSummary = {
    bean_name: bean?.name ?? null,
    country: bean?.country ?? null,
    region: bean?.region ?? null,
    town: bean?.town ?? null,
    altitude_min: bean?.altitude_min ?? null,
    altitude_max: bean?.altitude_max ?? null,
    variety: bean?.variety ?? null,
    process: bean?.process ?? null,
    roasted_at: roast.roasted_at,
    batch_g: roast.batch_g,
    level: roast.level,
    brew: roast.brew,
    fc_s: m.fcS,
    drop_s: m.dropS,
    dev_s: m.devS,
    dtr: m.dtr,
    weight_loss: m.weightLossPct,
    rating: ratings.length ? Math.max(...ratings) : null,
    tags: [...new Set(sortedTastings.flatMap((t) => t.tags))].slice(0, 12),
    tastings: tastings.length,
  }
  const now = new Date().toISOString()
  return {
    id: roast.id,
    display_name: opts.name.trim().slice(0, 40),
    bean_name: bean?.name.slice(0, 120) ?? null,
    country: bean?.country?.slice(0, 60) ?? null,
    process: bean?.process?.slice(0, 40) ?? null,
    shares_notes: notes,
    summary,
    data,
    published_at: opts.publishedAt ?? now,
    updated_at: now,
  }
}

// ——— turning a public row back into the app's own shapes, so charts and guides can show it ———

export function publicRoast(row: PublicRow): Roast {
  const r = row.data!.roast
  return { ...r, id: row.id, bean_id: null, reference_id: null, created_at: row.published_at, updated_at: row.updated_at }
}

export function publicBean(row: PublicRow): Bean | null {
  const b = row.data?.bean
  if (!b) return null
  return { ...b, id: `public-${row.id}`, price_per_kg: null, archived: false, created_at: row.published_at, updated_at: row.updated_at }
}

export function publicTastings(row: PublicRow): Tasting[] {
  return (row.data?.tastings ?? []).map((t, i) => ({ ...t, id: `${row.id}-t${i}`, roast_id: row.id, created_at: row.published_at, updated_at: row.updated_at }))
}

// ——— fetching ———

const LIST_COLUMNS = 'id,user_id,display_name,bean_name,country,process,shares_notes,summary,published_at,updated_at'
const LIBRARY_CACHE = 'roastery.library'

export function useLibrary() {
  const [rows, setRows] = useState<PublicRow[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LIBRARY_CACHE) ?? '[]') as PublicRow[]
    } catch {
      return []
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reload = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase.from('roast_public').select(LIST_COLUMNS).order('published_at', { ascending: false }).limit(500)
    if (err) setError(navigator.onLine ? err.message : 'Offline: showing the last copy of the library on this phone.')
    else {
      setError(null)
      setRows(data as PublicRow[])
      try {
        localStorage.setItem(LIBRARY_CACHE, JSON.stringify(data))
      } catch {
        // cache is a nice-to-have
      }
    }
    setLoading(false)
  }, [])
  useEffect(() => {
    void reload()
  }, [reload])
  return { rows, loading, error, reload }
}

export async function fetchPublicRoast(id: string): Promise<{ row: PublicRow | null; error: string | null }> {
  const { data, error } = await supabase.from('roast_public').select('*').eq('id', id).maybeSingle()
  if (error) return { row: null, error: error.message }
  return { row: (data as PublicRow | null) ?? null, error: null }
}
