import { createClient } from '@supabase/supabase-js'

// Publishable credentials: safe to ship in the browser; Row Level Security protects the data.
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://ydisjxcetvvatokvucvr.supabase.co'
const key = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_gyQ8uUHHtW5zqt5EAwHAuQ_L4DhkKWu'

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
