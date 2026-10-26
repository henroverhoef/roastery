import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../data/store'
import { Chips, Empty, Field, Header, numOrNull } from '../components/ui'
import { appearanceTags, roastLevels } from '../knowledge/roasting'
import { brewMethods } from '../knowledge/flavours'
import { fmtTime, tempIn, toC } from '../lib/format'
import type { EventType, Roast, Unit } from '../lib/types'

/** "9:30" → 570, "570" → 570 */
export function parseTime(s: string): number | null {
  const v = s.trim()
  if (!v) return null
  const m = v.match(/^(\d+):(\d{1,2}(?:\.\d+)?)$/)
  if (m) return parseInt(m[1], 10) * 60 + parseFloat(m[2])
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}

const eventTypes: { id: EventType; name: string }[] = [
  { id: 'yellow', name: 'Yellow' },
  { id: 'fc_start', name: '1st crack' },
  { id: 'fc_end', name: '1st crack end' },
  { id: 'sc_start', name: '2nd crack' },
  { id: 'drop', name: 'Cool (drop)' },
  { id: 'colour', name: 'Colour' },
  { id: 'smell', name: 'Smell' },
  { id: 'note', name: 'Note' },
]

type Row = { t: string; v: string }
type EvRow = { t: string; type: EventType; text: string }

const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function RoastEdit() {
  const { id } = useParams()
  const { roasts, beans, settings, saveRoast, loaded } = useStore()
  const navigate = useNavigate()
  const roast = roasts.find((r) => r.id === id)
  const unit = settings.unit
  if (!roast) return <div className="page"><Header title="Edit roast" back="/roasts" /><Empty>{loaded ? 'Roast not found.' : 'Loading…'}</Empty></div>
  return <Editor key={roast.id} roast={roast} unit={unit} beans={beans} onSave={(r) => { saveRoast(r); navigate(`/roasts/${r.id}`, { replace: true }) }} />
}

function Editor({ roast, unit, beans, onSave }: { roast: Roast; unit: Unit; beans: { id: string; name: string }[]; onSave: (r: Roast) => void }) {
  const tIn = (c: number | null) => (c == null ? '' : String(tempIn(c, unit)))
  const cOut = (s: string) => {
    const v = numOrNull(s)
    return v == null ? null : unit === 'F' ? toC(v) : v
  }
  const [meta, setMeta] = useState({
    bean_id: roast.bean_id ?? '',
    roasted_at: toLocalInput(roast.roasted_at),
    batch_g: roast.batch_g?.toString() ?? '',
    roasted_g: roast.roasted_g?.toString() ?? '',
    preheat: tIn(roast.preheat_c),
    ambient: tIn(roast.ambient_c),
    target_level: roast.target_level ?? '',
    level: roast.level ?? '',
    brew: roast.brew ?? '',
    notes: roast.notes ?? '',
    appearance: roast.appearance,
  })
  const [readings, setReadings] = useState<Row[]>(() => [...roast.readings].sort((a, b) => a.t - b.t).map((r) => ({ t: fmtTime(r.t), v: tIn(r.c) })))
  const [sets, setSets] = useState<Row[]>(() => [...roast.setpoints].sort((a, b) => a.t - b.t).map((r) => ({ t: fmtTime(r.t), v: tIn(r.c) })))
  const [events, setEvents] = useState<EvRow[]>(() => [...roast.events].sort((a, b) => a.t - b.t).map((e) => ({ t: fmtTime(e.t), type: e.type, text: e.value ?? e.note ?? '' })))

  function save() {
    const rows = (list: Row[]) =>
      list
        .map((r) => ({ t: parseTime(r.t), c: cOut(r.v) }))
        .filter((r): r is { t: number; c: number } => r.t != null && r.c != null)
        .sort((a, b) => a.t - b.t)
    const evs = events
      .map((e) => {
        const t = parseTime(e.t)
        if (t == null) return null
        const text = e.text.trim()
        return { t, type: e.type, ...(text ? (e.type === 'note' ? { note: text } : { value: text }) : {}) }
      })
      .filter((e): e is NonNullable<typeof e> => e != null)
      .sort((a, b) => a.t - b.t)
    onSave({
      ...roast,
      bean_id: meta.bean_id || null,
      roasted_at: new Date(meta.roasted_at).toISOString(),
      batch_g: numOrNull(meta.batch_g),
      roasted_g: numOrNull(meta.roasted_g),
      preheat_c: cOut(meta.preheat),
      ambient_c: cOut(meta.ambient),
      target_level: meta.target_level || null,
      level: meta.level || null,
      brew: meta.brew || null,
      notes: meta.notes.trim() || null,
      appearance: meta.appearance,
      readings: rows(readings),
      setpoints: rows(sets),
      events: evs,
    })
  }

  const listEditor = (title: string, list: Row[], setList: (r: Row[]) => void, placeholder: string) => (
    <div className="card space-y-2">
      <h2 className="h2">{title}</h2>
      {list.map((r, i) => (
        <div key={i} className="flex gap-2">
          <input className="input w-24" aria-label="Time (m:ss)" value={r.t} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, t: e.target.value } : x)))} />
          <input className="input flex-1" inputMode="numeric" aria-label={`°${unit}`} value={r.v} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))} />
          <button className="btn-ghost px-3" aria-label="Remove" onClick={() => setList(list.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button className="btn-secondary w-full" onClick={() => setList([...list, { t: '', v: '' }])}>+ Add {placeholder}</button>
      <p className="muted text-xs">Time as m:ss from when the beans went in, temperature in °{unit}.</p>
    </div>
  )

  return (
    <div className="page space-y-4">
      <Header title="Edit roast" back={`/roasts/${roast.id}`} />
      <div className="card grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Bean">
            <select className="input" value={meta.bean_id} onChange={(e) => setMeta({ ...meta, bean_id: e.target.value })}>
              <option value="">No bean</option>
              {beans.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Roasted at">
            <input className="input" type="datetime-local" value={meta.roasted_at} onChange={(e) => setMeta({ ...meta, roasted_at: e.target.value })} />
          </Field>
        </div>
        <Field label="Green in (g)"><input className="input" inputMode="decimal" value={meta.batch_g} onChange={(e) => setMeta({ ...meta, batch_g: e.target.value })} /></Field>
        <Field label="Roasted out (g)"><input className="input" inputMode="decimal" value={meta.roasted_g} onChange={(e) => setMeta({ ...meta, roasted_g: e.target.value })} /></Field>
        <Field label={`Preheat (°${unit})`}><input className="input" inputMode="numeric" value={meta.preheat} onChange={(e) => setMeta({ ...meta, preheat: e.target.value })} /></Field>
        <Field label={`Room (°${unit})`}><input className="input" inputMode="numeric" value={meta.ambient} onChange={(e) => setMeta({ ...meta, ambient: e.target.value })} /></Field>
        <Field label="Aimed for">
          <select className="input" value={meta.target_level} onChange={(e) => setMeta({ ...meta, target_level: e.target.value })}>
            <option value="">–</option>
            {roastLevels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        <Field label="Ended up">
          <select className="input" value={meta.level} onChange={(e) => setMeta({ ...meta, level: e.target.value })}>
            <option value="">–</option>
            {roastLevels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        <div className="col-span-2">
          <Field label="For">
            <select className="input" value={meta.brew} onChange={(e) => setMeta({ ...meta, brew: e.target.value })}>
              <option value="">Any</option>
              {brewMethods.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
        </div>
        <div className="col-span-2">
          <span className="label">Appearance</span>
          <Chips options={appearanceTags} value={meta.appearance} onChange={(appearance) => setMeta({ ...meta, appearance })} />
        </div>
        <div className="col-span-2">
          <Field label="Notes"><textarea className="input min-h-20" value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} /></Field>
        </div>
      </div>

      <div className="card space-y-2">
        <h2 className="h2">Events</h2>
        {events.map((e, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            <input className="input w-24" aria-label="Time (m:ss)" value={e.t} onChange={(ev) => setEvents(events.map((x, j) => (j === i ? { ...x, t: ev.target.value } : x)))} />
            <select className="input w-40 flex-1" value={e.type} onChange={(ev) => setEvents(events.map((x, j) => (j === i ? { ...x, type: ev.target.value as EventType } : x)))}>
              {eventTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {['colour', 'smell', 'note'].includes(e.type) && (
              <input className="input w-full" placeholder="what" value={e.text} onChange={(ev) => setEvents(events.map((x, j) => (j === i ? { ...x, text: ev.target.value } : x)))} />
            )}
            <button className="btn-ghost px-3" aria-label="Remove" onClick={() => setEvents(events.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button className="btn-secondary w-full" onClick={() => setEvents([...events, { t: '', type: 'fc_start', text: '' }])}>+ Add event</button>
      </div>

      {listEditor('Display readings', readings, setReadings, 'reading')}
      {listEditor('Set temperature changes', sets, setSets, 'set temp')}

      <button className="btn-primary sticky bottom-20 w-full py-3 shadow-lg" onClick={save}>Save changes</button>
    </div>
  )
}
