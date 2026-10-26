import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { sources, type SourceId } from '../knowledge/sources'

export function Chips<T extends string>({
  options,
  value,
  onChange,
  multi = true,
}: {
  options: readonly { id: T; name: string }[]
  value: T[]
  onChange: (v: T[]) => void
  multi?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.id)
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            className={on ? 'chip-on' : 'chip-off'}
            onClick={() => onChange(multi ? (on ? value.filter((v) => v !== o.id) : [...value, o.id]) : on ? [] : [o.id])}
          >
            {o.name}
          </button>
        )
      })}
    </div>
  )
}

export function Stars({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-2xl ${value != null && n <= value ? 'text-amber-500' : 'text-stone-300 dark:text-stone-700'}`}
          onClick={() => onChange(value === n ? null : n)}
        >
          ★
        </button>
      ))}
    </div>
  )
}

const sliderLabels = ['Far too little', 'A bit low', 'Just right', 'A bit much', 'Far too much']

/** -2 … +2 compared with what you'd like. */
export function Balance({ label, value, onChange, low, high }: { label: string; value: number | null; onChange: (v: number | null) => void; low?: string; high?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-stone-500">{value == null ? 'not rated' : sliderLabels[value + 2]}</span>
      </div>
      <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label={label}>
        {[-2, -1, 0, 1, 2].map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            aria-label={sliderLabels[v + 2]}
            onClick={() => onChange(value === v ? null : v)}
            className={`h-10 rounded-lg text-xs font-semibold ${
              value === v
                ? v === 0
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 text-stone-950'
                : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
            }`}
          >
            {v === 0 ? '✓' : v < 0 ? '−'.repeat(-v) : '+'.repeat(v)}
          </button>
        ))}
      </div>
      {(low || high) && (
        <div className="mt-0.5 flex justify-between text-[11px] text-stone-500">
          <span>{low}</span>
          <span>{high}</span>
        </div>
      )}
    </div>
  )
}

export function SourceLinks({ ids, className = '' }: { ids: SourceId[]; className?: string }) {
  const unique = [...new Set(ids)]
  if (!unique.length) return null
  return (
    <p className={`text-xs text-stone-500 dark:text-stone-400 ${className}`}>
      Sources:{' '}
      {unique.map((id, i) => (
        <span key={id}>
          {i > 0 && ' · '}
          <a href={sources[id].url} target="_blank" rel="noreferrer" className="underline decoration-stone-300 underline-offset-2 hover:text-amber-700 dark:decoration-stone-600">
            {sources[id].title}
            {sources[id].kind === 'forum' && ' (forum)'}
          </a>
        </span>
      ))}
    </p>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  )
}

export function Header({ title, back, action }: { title: string; back?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      {back && (
        <Link to={back} className="btn-ghost -ml-3 px-3" aria-label="Back">
          ←
        </Link>
      )}
      <h1 className="h1 min-w-0 flex-1 truncate">{title}</h1>
      {action}
    </div>
  )
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <div className="text-[11px] font-medium tracking-wide text-stone-500 uppercase">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      {sub && <div className="text-xs text-stone-500">{sub}</div>}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card text-center text-stone-600 dark:text-stone-400">{children}</div>
}

export const numOrNull = (s: string): number | null => {
  const v = parseFloat(s.replace(',', '.'))
  return Number.isFinite(v) ? v : null
}
