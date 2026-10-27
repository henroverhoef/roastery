import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Mode = 'signin' | 'signup' | 'reset'

export default function Login() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    const clean = email.trim().toLowerCase()
    const redirect = window.location.origin
    if (mode === 'signin') {
      const { error: err } = await supabase.auth.signInWithPassword({ email: clean, password })
      if (err) setError(err.message)
    } else if (mode === 'signup') {
      const res = await supabase.auth.signUp({ email: clean, password, options: { emailRedirectTo: redirect } })
      if (res.error) setError(res.error.message)
      else if (!res.data.session) setMessage('Check your email to confirm your account, then sign in here.')
    } else {
      const { error: err } = await supabase.auth.signInWithOtp({ email: clean, options: { emailRedirectTo: redirect, shouldCreateUser: false } })
      if (err) setError(err.message)
      else setMessage('Check your email for a sign-in link.')
    }
    setBusy(false)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <img src="/icons/icon-192.png" alt="" className="mb-4 h-16 w-16 rounded-2xl" />
      <h1 className="h1">Roastery</h1>
      <p className="muted mb-6">Roast log and coach for your Gene Café. Your roasts sync between your phone and computer.</p>
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-stone-200 p-1 text-sm font-semibold dark:bg-stone-800">
        {(
          [
            ['signin', 'Sign in'],
            ['signup', 'New account'],
            ['reset', 'Email link'],
          ] as const
        ).map(([m, label]) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-lg py-2 ${mode === m ? 'bg-white shadow-sm dark:bg-stone-950' : 'text-stone-600 dark:text-stone-400'}`}>
            {label}
          </button>
        ))}
      </div>
      <form className="card space-y-3" onSubmit={submit}>
        <label className="block">
          <span className="label">Email</span>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {mode !== 'reset' && (
          <label className="block">
            <span className="label">Password</span>
            <input
              className="input"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
        {message && <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send link'}
        </button>
      </form>
      <p className="muted mt-4 text-center text-xs">
        Same login as Worship Sets (it shares that database, but your roasts are private to you).
      </p>
      <div className="mt-4 flex flex-col items-center gap-2 text-sm">
        <Link to="/library" className="text-amber-700 underline dark:text-amber-400">Browse the public roast library</Link>
        <Link to="/guide" className="text-amber-700 underline dark:text-amber-400">Read the roasting guide</Link>
        <span className="text-xs text-stone-500">No account needed for either.</span>
      </div>
    </div>
  )
}
