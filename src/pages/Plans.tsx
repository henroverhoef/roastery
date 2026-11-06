import { Link, useNavigate } from 'react-router-dom'
import { useRoastNumbers, useStore } from '../data/store'
import { Empty, Header } from '../components/ui'
import { plans as builtIn } from '../knowledge/gene'
import { describeSteps, describeTargets } from '../lib/plans'
import { fmtDate } from '../lib/format'

export default function Plans() {
  const { myPlans, beans, roasts, settings } = useStore()
  const numbers = useRoastNumbers()
  const navigate = useNavigate()
  const unit = settings.unit
  return (
    <div className="page space-y-4">
      <Header title="My plans" back="/roasts" action={<Link to="/plans/new" className="btn-primary">+ Plan</Link>} />
      <p className="muted -mt-2">
        Design a roast before you start: the dial changes, when you expect yellow and first crack, when to press cool, and the curve you’re aiming for. Then roast with
        it and the app keeps you on track.
      </p>

      {myPlans.length ? (
        <div className="space-y-2">
          {myPlans.map((p) => {
            const targets = describeTargets(p)
            return (
              <div key={p.id} className="card">
                <div className="flex items-baseline justify-between gap-2">
                  <Link to={`/plans/${p.id}`} className="min-w-0 truncate font-semibold underline-offset-2 hover:underline">{p.name}</Link>
                  {p.bean_id && <span className="shrink-0 truncate text-xs text-stone-500">{beans.find((b) => b.id === p.bean_id)?.name}</span>}
                </div>
                <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">{describeSteps(p, unit) || 'No set temperatures yet'}</p>
                {targets && <p className="text-xs text-stone-500">{targets}</p>}
                <div className="mt-2 flex gap-2">
                  <Link to={`/roast/new?plan=${p.id}${p.bean_id ? `&bean=${p.bean_id}` : ''}`} className="btn-primary flex-1 py-2 text-sm">Roast with it</Link>
                  <Link to={`/plans/${p.id}`} className="btn-secondary py-2 text-sm">Edit</Link>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Empty>No plans yet. Start from scratch, from one of your roasts, or from a published Gene profile below.</Empty>
      )}

      <div className="card space-y-3">
        <h2 className="h2">Start a plan from…</h2>
        <select className="input" value="" onChange={(e) => e.target.value && navigate(`/plans/new?from=${e.target.value}`)} aria-label="One of your roasts">
          <option value="">One of your roasts…</option>
          {roasts.map((r) => (
            <option key={r.id} value={r.id}>#{numbers.get(r.id)} {beans.find((b) => b.id === r.bean_id)?.name ?? 'Quick roast'} · {fmtDate(r.roasted_at)}</option>
          ))}
        </select>
        <select className="input" value="" onChange={(e) => e.target.value && navigate(`/plans/new?base=${e.target.value}`)} aria-label="A published Gene profile">
          <option value="">A published Gene profile…</option>
          {builtIn.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <Link to="/plans/new" className="btn-secondary w-full">A blank plan</Link>
        <Link to="/plans/import" className="btn-secondary w-full">Import a plan from Claude</Link>
        <p className="muted text-xs">
          Tip: after tasting a roast, its page can turn the app’s suggestion (e.g. “cool 55 s later”) straight into a plan for the next one. Or tick “ask for a roast plan” when
          you copy it for Claude, and import Claude’s plan here.
        </p>
      </div>
    </div>
  )
}
