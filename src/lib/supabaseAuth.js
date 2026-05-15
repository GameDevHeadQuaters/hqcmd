import { supabase } from './supabase'

export async function signUp(email, password, metadata = {}) {
  return supabase.auth.signUp({ email, password, options: { data: metadata } })
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
