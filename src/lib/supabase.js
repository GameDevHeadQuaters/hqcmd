import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase

try {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'hqcmd-auth-token',
      storage: window.localStorage,
    }
  })
  console.log('[Supabase] Client initialised:', supabaseUrl)
} catch(e) {
  console.error('[Supabase] Client creation failed:', e)
  // Dummy client — logs errors instead of crashing
  supabase = new Proxy({}, {
    get: (_, prop) => {
      if (prop === 'auth') return new Proxy({}, {
        get: (_, authProp) => (...args) => {
          console.error(`[Supabase] Auth.${authProp} called but client not initialised`)
          return Promise.resolve({ data: null, error: new Error('Supabase not initialised') })
        }
      })
      return (...args) => {
        console.error(`[Supabase] ${prop} called but client not initialised`)
        return { select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) }
      }
    }
  })
}

export { supabase }
