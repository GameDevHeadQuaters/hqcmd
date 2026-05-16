import { supabase } from '../lib/supabase'

export async function pushNotification(userId, notification) {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: String(userId),
      type: notification.type,
      message: notification.message,
      link: notification.link || null,
      read: false,
    })
    if (error) console.error('[Notify] Supabase error:', error)
    else console.log('[Notify] ✅ Sent to Supabase for:', userId)
  } catch (e) {
    console.error('[Notify] Failed:', e)
  }

  // Also write to localStorage as fallback
  const USERDATA_KEY = 'hqcmd_userData_v4'
  try {
    const allData = JSON.parse(localStorage.getItem(USERDATA_KEY) || '{}')
    const uid = String(userId)
    if (!allData[uid]) allData[uid] = { notifications: [] }
    if (!Array.isArray(allData[uid].notifications)) allData[uid].notifications = []
    allData[uid].notifications.unshift({
      id: String(Date.now()) + '_' + Math.random().toString(36).slice(2),
      type: notification.type,
      message: notification.message,
      link: notification.link || null,
      read: false,
      timestamp: new Date().toISOString(),
    })
    localStorage.setItem(USERDATA_KEY, JSON.stringify(allData))
    window.dispatchEvent(new Event('storage'))
  } catch {}
}
