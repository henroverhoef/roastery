import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../data/store'
import { Balance, Chips, Empty, Field, Header, Stars } from '../components/ui'
import { brewMethods, flavourGroups, flavours, findFlavour, wants } from '../knowledge/flavours'
import { findOrigin } from '../knowledge/origins'
import { adviseTasting } from '../lib/advice'
import { daysBetween, todayLocal, uid } from '../lib/format'
import type { Roast, Tasting } from '../lib/types'

export default function TastingForm() {
  const { id, tastingId } = useParams()
  const { roasts, tastings, loaded } = useStore()
  const roast = roasts.find((r) => r.id === id)
  const existing = tastings.find((t) => t.id === tastingId)
  if (!roast || (tastingId && !existing)) {
    return <div className="page"><Header title="Tasting" back={roast ? `/roasts/${roast.id}` : '/roasts'} /><Empty>{loaded ? 'Not found.' : 'Loading…'}</Empty></div>
  }
  return <Form key={existing?.id ?? 'new'} roast={roast} existing={existing} />
}

function Form({ roast, existing }: { roast: Roast; existing: Tasting | undefined }) {
  const { roasts, beans, tastings, settings, saveTasting, deleteTasting } = useStore()
  const navigate = useNavigate()
  const id = roast.id
  const bean = beans.find((b) => b.id === roast.bean_id) ?? null
  const origin = findOrigin(bean?.country)

  const [t, setT] = useState<Tasting>(
    () =>
      existing ?? {
        id: uid(),
        roast_id: id,
        tasted_on: todayLocal(),
        brew: roast.brew ?? null,
        rating: null,
        acidity: null,
        sweetness: null,
        body: null,
        bitterness: null,
        tags: [],
        wants: [],
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
  )
  const set = (patch: Partial<Tasting>) => setT((prev) => ({ ...prev, ...patch }))

  const history = useMemo(
    () => (roast.bean_id ? roasts.filter((r) => r.bean_id === roast.bean_id && r.id !== roast.id).map((r) => ({ roast: r, tastings: tastings.filter((x) => x.roast_id === r.id) })) : []),
    [roasts, tastings, roast],
  )

  const preview = adviseTasting({ roast, bean, tasting: t, history, unit: settings.unit })
  const days = daysBetween(roast.roasted_at, t.tasted_on)
  const aim = bean?.target_flavours.length ? bean.target_flavours : origin?.best ?? []

  function save() {
    saveTasting(t)
    navigate(`/roasts/${roast.id}`, { replace: true })
  }

  return (
    <div className="page space-y-4">
      <Header title={existing ? 'Edit tasting' : 'How did it taste?'} back={`/roasts/${roast.id}`} />

      {(aim.length > 0 || bean?.seller_notes) && (
        <div className="card text-sm">
          {aim.length > 0 && (
            <p>
              <span className="text-stone-500">{bean?.target_flavours.length ? 'You’re aiming for: ' : `${origin?.name} at its best: `}</span>
              {aim.map((a) => findFlavour(a)?.name ?? a).join(', ')}
            </p>
          )}
          {bean?.seller_notes && <p className="mt-1"><span className="text-stone-500">Seller says: </span>{bean.seller_notes}</p>}
        </div>
      )}

      <div className="card grid grid-cols-2 gap-3">
        <Field label="Tasted on" hint={days >= 0 ? `${days} day${days === 1 ? '' : 's'} after roasting` : undefined}>
          <input className="input" type="date" value={t.tasted_on} onChange={(e) => set({ tasted_on: e.target.value })} />
        </Field>
        <Field label="Brewed as">
          <select className="input" value={t.brew ?? ''} onChange={(e) => set({ brew: e.target.value || null })}>
            <option value="">–</option>
            {brewMethods.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </Field>
        <div className="col-span-2">
          <span className="label">Overall</span>
          <Stars value={t.rating} onChange={(rating) => set({ rating })} />
        </div>
      </div>

      <div className="card space-y-4">
        <p className="muted">Compared with what you’d like:</p>
        <Balance label="Acidity" value={t.acidity} onChange={(acidity) => set({ acidity })} low="flat, dull" high="sharp, sour" />
        <Balance label="Sweetness" value={t.sweetness} onChange={(sweetness) => set({ sweetness })} low="not sweet" high="cloying" />
        <Balance label="Body" value={t.body} onChange={(body) => set({ body })} low="thin, watery" high="heavy, muddy" />
        <Balance label="Bitterness" value={t.bitterness} onChange={(bitterness) => set({ bitterness })} low="none at all" high="harsh" />
      </div>

      <div className="card space-y-3">
        <h2 className="h2">Flavours you noticed</h2>
        {flavourGroups.map((g) => (
          <div key={g.id}>
            <p className={`mb-1 text-xs font-semibold tracking-wide uppercase ${g.id === 'under' || g.id === 'over' || g.id === 'flat' ? 'text-red-700 dark:text-red-400' : 'text-stone-500'}`}>{g.name}</p>
            <Chips
              options={flavours.filter((f) => f.group === g.id)}
              value={t.tags.filter((x) => findFlavour(x)?.group === g.id)}
              onChange={(v) => set({ tags: [...t.tags.filter((x) => findFlavour(x)?.group !== g.id), ...v] })}
            />
          </div>
        ))}
      </div>

      <div className="card space-y-2">
        <h2 className="h2">Next time I want…</h2>
        <Chips options={wants} value={t.wants as (typeof wants)[number]['id'][]} onChange={(w) => set({ wants: w })} />
      </div>

      <div className="card">
        <Field label="Notes">
          <textarea className="input min-h-20" value={t.notes ?? ''} onChange={(e) => set({ notes: e.target.value || null })} placeholder="grind, recipe, how it changed as it cooled…" />
        </Field>
      </div>

      <div className="rounded-2xl bg-stone-100 p-3 text-sm dark:bg-stone-800">
        <span className="font-semibold">Preview: </span>
        {preview.headline}
      </div>

      <button className="btn-primary w-full py-3" onClick={save}>Save tasting</button>
      {existing && (
        <button
          className="btn-ghost w-full text-red-700 dark:text-red-400"
          onClick={() => {
            if (confirm('Delete this tasting?')) {
              deleteTasting(existing.id)
              navigate(`/roasts/${roast.id}`, { replace: true })
            }
          }}
        >
          Delete tasting
        </button>
      )}
    </div>
  )
}
