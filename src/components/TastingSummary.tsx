import type { Tasting } from '../lib/types'
import { daysBetween } from '../lib/format'
import { findFlavour, wants as wantList } from '../knowledge/flavours'

const steps = (v: number) => (v === 0 ? '✓' : v > 0 ? '+'.repeat(v) : '−'.repeat(-v))

/** One tasting: date, rating, flavours, sliders, wants and notes. */
export default function TastingSummary({ t, roastedAt }: { t: Tasting; roastedAt: string }) {
  const sliders = (
    [
      ['Acidity', t.acidity],
      ['Sweetness', t.sweetness],
      ['Body', t.body],
      ['Bitterness', t.bitterness],
    ] as const
  ).filter(([, v]) => v != null)
  return (
    <>
      <div className="flex items-baseline justify-between">
        <span className="font-medium">{t.tasted_on} · day {daysBetween(roastedAt, t.tasted_on)}{t.brew ? ` · ${t.brew}` : ''}</span>
        <span className="text-amber-500">{t.rating ? '★'.repeat(t.rating) : ''}</span>
      </div>
      {t.tags.length > 0 && <p className="mt-1 text-sm">{t.tags.map((x) => findFlavour(x)?.name ?? x).join(' · ')}</p>}
      <p className="mt-1 text-xs text-stone-500">
        {sliders.map(([k, v]) => `${k} ${steps(v as number)}`).join(' · ')}
        {t.wants.length ? `${sliders.length ? ' · ' : ''}wants: ${t.wants.map((w) => wantList.find((x) => x.id === w)?.name ?? w).join(', ')}` : ''}
      </p>
      {t.notes && <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{t.notes}</p>}
    </>
  )
}
