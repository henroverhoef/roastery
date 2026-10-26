import { useState } from 'react'
import { useStore } from '../data/store'
import { Field, Header, numOrNull } from '../components/ui'
import { allRoastsCsv, copyText, downloadText } from '../lib/export'

export default function Settings() {
  const { settings, saveSettings, session, signOut, roasts, beans, tastings, pending, refresh } = useStore()
  const [msg, setMsg] = useState<string | null>(null)
  const [batch, setBatch] = useState(String(settings.batch_g))
  const [alt, setAlt] = useState(settings.location_m?.toString() ?? '')

  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(null), 2500)
  }

  return (
    <div className="page space-y-4">
      <Header title="Settings" />

      <div className="card space-y-4">
        <div>
          <span className="label">My Gene shows</span>
          <div className="grid grid-cols-2 gap-2">
            {(['C', 'F'] as const).map((u) => (
              <button key={u} className={settings.unit === u ? 'btn-primary' : 'btn-secondary'} onClick={() => saveSettings({ unit: u, unitChosen: true })}>°{u}</button>
            ))}
          </div>
          <p className="muted mt-1 text-xs">Everything is stored in °C, so switching is safe.</p>
        </div>
        <Field label="Usual batch (g)">
          <input className="input" inputMode="numeric" value={batch} onChange={(e) => setBatch(e.target.value)} onBlur={() => { const v = numOrNull(batch); if (v) saveSettings({ batch_g: v }) }} />
        </Field>
        <div>
          <span className="label">Remind me to log a temperature every</span>
          <div className="grid grid-cols-5 gap-1.5">
            {[0, 20, 30, 45, 60].map((s) => (
              <button key={s} className={settings.reminder_s === s ? 'btn-primary px-0' : 'btn-secondary px-0'} onClick={() => saveSettings({ reminder_s: s })}>{s ? `${s}s` : 'Off'}</button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.sound} onChange={(e) => saveSettings({ sound: e.target.checked })} /> Beep (otherwise vibrate only)
        </label>
        <Field label="Altitude where I roast (m)" hint="Optional: thin air at altitude changes how roasters behave">
          <input className="input" inputMode="numeric" value={alt} onChange={(e) => setAlt(e.target.value)} onBlur={() => saveSettings({ location_m: numOrNull(alt) })} />
        </Field>
      </div>

      <div className="card space-y-2">
        <h2 className="h2">Your data</h2>
        <p className="muted">{roasts.length} roasts · {beans.length} beans · {tastings.length} tastings{pending ? ` · ${pending} waiting to sync` : ''}</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => downloadText('roastery-all-roasts.csv', allRoastsCsv(roasts, beans, tastings, settings.unit))}>Download all roasts (CSV)</button>
          <button className="btn-secondary" onClick={async () => flash((await copyText(allRoastsCsv(roasts, beans, tastings, settings.unit))) ? 'Copied' : 'Couldn’t copy')}>Copy all roasts</button>
          <button className="btn-secondary" onClick={() => refresh().then(() => flash('Up to date'))}>Sync now</button>
        </div>
        {msg && <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400" role="status">{msg}</p>}
      </div>

      <div className="card space-y-2">
        <h2 className="h2">Account</h2>
        <p className="muted">Signed in as {session?.user.email}</p>
        <button className="btn-secondary" onClick={() => signOut()}>Sign out</button>
      </div>

      <div className="card text-sm">
        <p className="font-semibold">Install on your phone</p>
        <p className="muted mt-1">
          Android (Chrome): menu ⋮ → <i>Install app</i>. iPhone (Safari): Share → <i>Add to Home Screen</i>. It then opens full screen and works offline; roasts sync when you’re back online.
        </p>
      </div>

      <p className="muted text-center text-xs">Version {import.meta.env.VITE_APP_VERSION}</p>
    </div>
  )
}
