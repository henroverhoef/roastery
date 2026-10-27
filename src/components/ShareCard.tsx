import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../data/store'

export default function ShareCard({ roastId }: { roastId: string }) {
  const { shares, settings, shareRoast, unshareRoast, saveSettings } = useStore()
  const share = shares.find((s) => s.id === roastId)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(share?.display_name ?? settings.public_name ?? '')
  const [notes, setNotes] = useState(share?.shares_notes ?? false)
  const clean = name.trim()
  // Start the form from the latest values (they may have loaded after this card appeared).
  const openForm = () => {
    setName(share?.display_name ?? settings.public_name ?? '')
    setNotes(share?.shares_notes ?? false)
    setOpen(true)
  }

  function submit() {
    if (!clean) return
    if (clean !== settings.public_name) saveSettings({ public_name: clean })
    shareRoast(roastId, { name: clean, includeNotes: notes })
    setOpen(false)
  }

  return (
    <section className="card space-y-2">
      <h2 className="h2">Public library</h2>
      {share && !open ? (
        <>
          <p className="text-sm">
            ✓ Shared as <b>{share.display_name}</b>
            {share.shares_notes ? ', with your written notes' : ', without your written notes'}. It updates by itself when you add a tasting or edit this roast.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to={`/library/${roastId}`} className="btn-secondary">View</Link>
            <button className="btn-secondary" onClick={openForm}>Change</button>
            <button
              className="btn-ghost text-red-700 dark:text-red-400"
              onClick={() => {
                if (confirm('Remove this roast from the public library? Your own copy stays.')) unshareRoast(roastId)
              }}
            >
              Remove
            </button>
          </div>
        </>
      ) : !open ? (
        <>
          <p className="muted">Let other Gene roasters see this roast’s curve and how it tasted, and roast along with it.</p>
          <button className="btn-secondary" onClick={openForm}>Share in the public library…</button>
        </>
      ) : (
        <div className="space-y-3">
          <label className="block">
            <span className="label">Name to show</span>
            <input className="input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. your first name or a nickname" />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={notes} onChange={(e) => setNotes(e.target.checked)} />
            <span>Include my written notes (roast notes, tasting notes, bean notes, notes typed while roasting)</span>
          </label>
          <div className="rounded-xl bg-stone-100 p-3 text-xs text-stone-700 dark:bg-stone-800 dark:text-stone-300">
            <p>
              <b>Shared:</b> the curve, set temperatures and events; batch and roasted weight; roast level; the bean’s origin, region, farm, altitude, variety,
              process, grade, harvest, supplier and seller’s notes; your tasting ratings, flavour tags and sliders.
            </p>
            <p className="mt-1">
              <b>Never shared:</b> your email, the price you paid{notes ? '' : ', anything you typed as notes'}. Anyone can see the library, even without signing in.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={!clean} onClick={submit}>{share ? 'Update' : 'Share'}</button>
            <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  )
}
