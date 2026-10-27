import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../data/store'
import { useLibrary, type PublicRow } from '../lib/public'
import { Empty, Header } from '../components/ui'
import { fmtDate, fmtPct, fmtTime } from '../lib/format'
import { findOrigin } from '../knowledge/origins'
import { findProcess } from '../knowledge/processes'
import { findLevel } from '../knowledge/roasting'
import { findFlavour } from '../knowledge/flavours'

const originName = (c: string | null) => (c ? (findOrigin(c)?.name ?? c) : null)

export default function Library() {
  const { rows, loading, error, reload } = useLibrary()
  const { session } = useStore()
  const me = session?.user.id
  const [q, setQ] = useState('')
  const [country, setCountry] = useState('')
  const [process, setProcess] = useState('')
  const [sort, setSort] = useState<'new' | 'rating'>('new')

  const countries = useMemo(() => [...new Set(rows.map((r) => r.country).filter((c): c is string => !!c))].sort((a, b) => (originName(a) ?? a).localeCompare(originName(b) ?? b)), [rows])
  const processes = useMemo(() => [...new Set(rows.map((r) => r.process).filter((p): p is string => !!p))], [rows])

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const out = rows.filter((r) => {
      if (country && r.country !== country) return false
      if (process && r.process !== process) return false
      if (!needle) return true
      const s = r.summary
      return [r.bean_name, r.display_name, originName(r.country), s.region, s.town, s.variety, ...s.tags.map((t) => findFlavour(t)?.name)]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(needle))
    })
    if (sort === 'rating') out.sort((a, b) => (b.summary.rating ?? 0) - (a.summary.rating ?? 0) || b.published_at.localeCompare(a.published_at))
    return out
  }, [rows, q, country, process, sort])

  return (
    <div className="page space-y-3">
      <Header title="Public library" action={<button className="btn-ghost px-3" onClick={() => reload()} aria-label="Refresh">↻</button>} />
      <p className="muted -mt-2">
        Roasts other Gene roasters chose to share: their curves, timings and how they tasted. Open one to roast along with it.
        {session ? ' To share yours, open one of your roasts and tap “Share in the public library”.' : ''}
      </p>

      <input className="input" type="search" placeholder="Search bean, region, roaster, flavour…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid grid-cols-3 gap-2">
        <select className="input px-2 text-sm" value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Origin">
          <option value="">Origin</option>
          {countries.map((c) => <option key={c} value={c}>{originName(c)}</option>)}
        </select>
        <select className="input px-2 text-sm" value={process} onChange={(e) => setProcess(e.target.value)} aria-label="Process">
          <option value="">Process</option>
          {processes.map((p) => <option key={p} value={p}>{findProcess(p)?.name ?? p}</option>)}
        </select>
        <select className="input px-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value as 'new' | 'rating')} aria-label="Sort">
          <option value="new">Newest</option>
          <option value="rating">Best rated</option>
        </select>
      </div>

      {error && <p className="text-sm text-amber-700 dark:text-amber-400">{error}</p>}
      {list.length ? (
        <div className="space-y-2">
          {list.map((r) => <LibraryCard key={r.id} row={r} mine={r.user_id === me} />)}
        </div>
      ) : (
        <Empty>{loading ? 'Loading…' : rows.length ? 'Nothing matches those filters.' : 'Nobody has shared a roast yet. Be the first: open one of your roasts and share it.'}</Empty>
      )}
    </div>
  )
}

function LibraryCard({ row, mine }: { row: PublicRow; mine: boolean }) {
  const s = row.summary
  const alt = [s.altitude_min, s.altitude_max].filter(Boolean).join('–')
  return (
    <Link to={`/library/${row.id}`} className="card block transition hover:ring-amber-400">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold">{row.bean_name ?? 'Unnamed bean'}</div>
          <div className="text-xs text-stone-500">
            by {row.display_name}
            {mine && <span className="ml-1 rounded bg-amber-100 px-1 text-amber-900 dark:bg-amber-900 dark:text-amber-100">you</span>} · roasted {fmtDate(s.roasted_at)}
          </div>
        </div>
        <div className="shrink-0 text-amber-500" aria-label={s.rating ? `${s.rating} stars` : 'not rated'}>
          {s.rating ? '★'.repeat(s.rating) : <span className="text-xs text-stone-400">not rated</span>}
        </div>
      </div>
      <div className="mt-1 text-sm text-stone-600 dark:text-stone-400">
        {[originName(row.country), s.region, findProcess(row.process)?.name ?? row.process, alt && `${alt} m`].filter(Boolean).join(' · ')}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums text-stone-700 dark:text-stone-300">
        {s.batch_g && <span>{s.batch_g} g</span>}
        <span>1C {fmtTime(s.fc_s)}</span>
        <span>Cool {fmtTime(s.drop_s)}</span>
        <span>DTR {fmtPct(s.dtr)}</span>
        {s.weight_loss != null && <span>Loss {s.weight_loss.toFixed(1)}%</span>}
        {s.level && <span>{findLevel(s.level)?.name}</span>}
      </div>
      {s.tags.length > 0 && <div className="mt-1 truncate text-xs text-stone-500">{s.tags.slice(0, 5).map((t) => findFlavour(t)?.name ?? t).join(' · ')}</div>}
    </Link>
  )
}
