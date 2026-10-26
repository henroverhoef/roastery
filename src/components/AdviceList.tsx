import type { Advice } from '../lib/advice'
import { SourceLinks } from './ui'

const toneStyle = {
  change: { cls: 'border-amber-500 bg-amber-50 dark:bg-amber-950/40', icon: '➜', label: 'Change' },
  keep: { cls: 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40', icon: '✓', label: 'Keep' },
  info: { cls: 'border-sky-600 bg-sky-50 dark:bg-sky-950/40', icon: 'ℹ', label: 'Good to know' },
  warn: { cls: 'border-red-600 bg-red-50 dark:bg-red-950/40', icon: '!', label: 'Careful' },
} as const

export default function AdviceList({ advice }: { advice: Advice }) {
  return (
    <div className="space-y-2">
      <p className="text-base font-semibold">{advice.headline}</p>
      {advice.items.map((i) => {
        const t = toneStyle[i.tone]
        return (
          <div key={i.id} className={`rounded-xl border-l-4 p-3 ${t.cls}`}>
            <div className="flex items-start gap-2">
              <span aria-hidden className="mt-0.5 w-4 shrink-0 text-center font-bold">{t.icon}</span>
              <div className="min-w-0">
                <p className="font-semibold">
                  <span className="sr-only">{t.label}: </span>
                  {i.title}
                </p>
                <p className="mt-0.5 text-sm text-stone-700 dark:text-stone-300">{i.body}</p>
                <SourceLinks ids={i.sources} className="mt-1.5" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
