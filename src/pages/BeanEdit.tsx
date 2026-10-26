import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '../data/store'
import { Chips, Empty, Field, Header, numOrNull } from '../components/ui'
import { origins } from '../knowledge/origins'
import { processes } from '../knowledge/processes'
import { flavours } from '../knowledge/flavours'
import { varieties } from '../knowledge/varieties'
import { uid } from '../lib/format'
import type { Bean } from '../lib/types'

const continents = [...new Set(origins.map((o) => o.continent))]

export default function BeanEdit() {
  const { id } = useParams()
  const { beans, loaded } = useStore()
  const existing = beans.find((b) => b.id === id)
  if (id && !existing) return <div className="page"><Header title="Edit bean" back="/beans" /><Empty>{loaded ? 'Bean not found.' : 'Loading…'}</Empty></div>
  return <Form key={existing?.id ?? 'new'} existing={existing} />
}

function Form({ existing }: { existing: Bean | undefined }) {
  const [params] = useSearchParams()
  const { saveBean, deleteBean, roasts } = useStore()
  const navigate = useNavigate()
  const now = new Date().toISOString()
  const [b, setB] = useState<Bean>(
    () =>
      existing ?? {
        id: uid(), name: '', country: null, region: null, town: null, producer: null, altitude_min: null, altitude_max: null, variety: null,
        process: null, grade: null, harvest: null, supplier: null, price_per_kg: null, seller_notes: null, target_flavours: [], notes: null,
        archived: false, created_at: now, updated_at: now,
      },
  )
  const set = (patch: Partial<Bean>) => setB((prev) => ({ ...prev, ...patch }))
  const text = (k: keyof Bean) => ({ value: (b[k] as string | null) ?? '', onChange: (e: { target: { value: string } }) => set({ [k]: e.target.value || null } as Partial<Bean>) })
  const origin = origins.find((o) => o.id === b.country)
  const known = !b.country || origins.some((o) => o.id === b.country)
  const [otherCountry, setOtherCountry] = useState(!known)
  const positive = flavours.filter((f) => !f.defect)

  function save() {
    const name = b.name.trim() || [origin?.name ?? b.country, b.region, b.town].filter(Boolean).join(' ') || 'Unnamed bean'
    const bean = { ...b, name }
    saveBean(bean)
    if (params.get('then') === 'roast') navigate(`/roast/new?bean=${bean.id}`, { replace: true })
    else navigate(`/beans/${bean.id}`, { replace: true })
  }

  return (
    <div className="page space-y-4">
      <Header title={existing ? 'Edit bean' : 'New bean'} back={existing ? `/beans/${existing.id}` : '/beans'} />

      <div className="card space-y-3">
        <Field label="Name" hint="Leave empty to use origin + region">
          <input className="input" placeholder="e.g. Ethiopia Guji Hambela" {...text('name')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Country">
            {otherCountry ? (
              <input className="input" placeholder="Country" {...text('country')} />
            ) : (
              <select className="input" value={b.country ?? ''} onChange={(e) => (e.target.value === '__other' ? (setOtherCountry(true), set({ country: null })) : set({ country: e.target.value || null }))}>
                <option value="">Choose…</option>
                {continents.map((c) => (
                  <optgroup key={c} label={c}>
                    {origins.filter((o) => o.continent === c).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </optgroup>
                ))}
                <option value="__other">Other…</option>
              </select>
            )}
          </Field>
          <Field label="Process">
            <select className="input" value={b.process ?? ''} onChange={(e) => set({ process: e.target.value || null })}>
              <option value="">Not sure</option>
              {processes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Region">
            <input className="input" list="regions" placeholder="e.g. Huila, Guji" {...text('region')} />
            <datalist id="regions">
              {origin?.regions?.map((r) => <option key={r.name} value={r.name} />)}
            </datalist>
          </Field>
          <Field label="Town / farm / washing station">
            <input className="input" {...text('town')} />
          </Field>
          <Field label="Altitude from (m)">
            <input className="input" inputMode="numeric" value={b.altitude_min ?? ''} onChange={(e) => set({ altitude_min: numOrNull(e.target.value) })} />
          </Field>
          <Field label="to (m)">
            <input className="input" inputMode="numeric" value={b.altitude_max ?? ''} onChange={(e) => set({ altitude_max: numOrNull(e.target.value) })} />
          </Field>
          <Field label="Variety">
            <input className="input" list="varieties" placeholder="e.g. SL28, Bourbon" {...text('variety')} />
            <datalist id="varieties">
              {varieties.map((v) => <option key={v.id} value={v.name} />)}
              {['Caturra', 'Catuaí', 'Castillo', 'Pacas', 'Catimor', 'Mundo Novo', 'Yellow Bourbon', 'Red Bourbon', 'Heirloom'].map((v) => <option key={v} value={v} />)}
            </datalist>
          </Field>
          <Field label="Grade / screen">
            <input className="input" placeholder="AA, SHB, peaberry…" {...text('grade')} />
          </Field>
          <Field label="Producer">
            <input className="input" {...text('producer')} />
          </Field>
          <Field label="Harvest">
            <input className="input" placeholder="e.g. 2026" {...text('harvest')} />
          </Field>
          <Field label="Supplier">
            <input className="input" {...text('supplier')} />
          </Field>
          <Field label="Price per kg">
            <input className="input" inputMode="decimal" value={b.price_per_kg ?? ''} onChange={(e) => set({ price_per_kg: numOrNull(e.target.value) })} />
          </Field>
        </div>
        <Field label="Seller’s tasting notes">
          <textarea className="input min-h-16" placeholder="copy them from the bag or website" {...text('seller_notes')} />
        </Field>
      </div>

      <div className="card space-y-2">
        <h2 className="h2">What are you aiming for?</h2>
        <p className="muted">
          The advice compares each tasting with this.{' '}
          {origin?.best.length ? `If you leave it empty the app aims for ${origin.name}’s classic profile.` : 'If you leave it empty, the app only reacts to off-flavours.'}
        </p>
        <Chips options={positive} value={b.target_flavours} onChange={(target_flavours) => set({ target_flavours })} />
      </div>

      <div className="card">
        <Field label="Notes">
          <textarea className="input min-h-16" {...text('notes')} />
        </Field>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={b.archived} onChange={(e) => set({ archived: e.target.checked })} /> Finished / hide from the roast list
        </label>
      </div>

      <button className="btn-primary w-full py-3" onClick={save}>Save bean</button>
      {existing && (
        <button
          className="btn-ghost w-full text-red-700 dark:text-red-400"
          onClick={() => {
            const n = roasts.filter((r) => r.bean_id === existing.id).length
            if (confirm(n ? `Delete this bean? Its ${n} roast(s) are kept but won’t be linked to a bean.` : 'Delete this bean?')) {
              deleteBean(existing.id)
              navigate('/beans', { replace: true })
            }
          }}
        >
          Delete bean
        </button>
      )}
    </div>
  )
}
