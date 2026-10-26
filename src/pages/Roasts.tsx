import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRoastNumbers, useStore } from '../data/store'
import RoastCard from '../components/RoastCard'
import { Empty, Header } from '../components/ui'
import { uid } from '../lib/format'

export default function Roasts() {
  const { roasts, beans, tastings, settings, saveRoast } = useStore()
  const numbers = useRoastNumbers()
  const navigate = useNavigate()
  const [bean, setBean] = useState('')
  const beanById = new Map(beans.map((b) => [b.id, b]))
  const list = bean ? roasts.filter((r) => r.bean_id === bean) : roasts
  const used = beans.filter((b) => roasts.some((r) => r.bean_id === b.id))
  return (
    <div className="page">
      <Header title="Roasts" action={<Link to="/roast/new" className="btn-primary">+ Roast</Link>} />
      {used.length > 1 && (
        <select className="input mb-3" value={bean} onChange={(e) => setBean(e.target.value)} aria-label="Filter by bean">
          <option value="">All beans</option>
          {used.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      )}
      {list.length ? (
        <div className="space-y-2">
          {list.map((r) => (
            <RoastCard key={r.id} roast={r} bean={beanById.get(r.bean_id ?? '')} tastings={tastings.filter((t) => t.roast_id === r.id)} n={numbers.get(r.id)} unit={settings.unit} />
          ))}
        </div>
      ) : (
        <Empty>No roasts yet.</Empty>
      )}
      <button
        className="btn-ghost mt-4 w-full text-sm"
        onClick={() => {
          const now = new Date().toISOString()
          const id = uid()
          saveRoast({
            id, bean_id: bean || null, roasted_at: now, batch_g: settings.batch_g, roasted_g: null, ambient_c: null, preheat_c: null, brew: null,
            target_level: null, plan_id: null, reference_id: null, readings: [], setpoints: [], events: [], level: null, appearance: [], notes: null,
            created_at: now, updated_at: now,
          })
          navigate(`/roasts/${id}/edit`)
        }}
      >
        + Log a past roast by hand
      </button>
    </div>
  )
}
