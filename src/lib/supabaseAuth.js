import { supabase } from './supabase'

export async function signUp(email, password, metadata = {}) {
  console.log('[supabaseAuth] signUp called for:', email)
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name: metadata.name } } })
  console.log('[supabaseAuth] signUp response - data:', data, 'error:', error)
  if (error) throw error
  return { data, error: null }
}

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getUserProfile(userId) {
  return supabase.from('profiles').select('*').eq('id', userId).single()
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange(callback)
  return data.subscription
}
