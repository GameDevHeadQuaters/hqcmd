import { ACHIEVEMENTS } from './achievements'

export async function checkAndAwardAchievements(currentUser, setCurrentUser) {
  if (!currentUser || currentUser.isAdmin) return
  if (!currentUser.id) return

  // Get already earned achievements from Supabase first, fall back to currentUser state
  let earnedAchievements = []
  let earnedIds = []
  try {
    const { supabase } = await import('../lib/supabase')
    const { data } = await supabase
      .from('users')
      .select('achievements')
      .eq('id', String(currentUser.id))
      .single()

    if (data?.achievements) {
      earnedAchievements = data.achievements
      earnedIds = data.achievements.map(a => a.id || a)
      console.log('[Achievements] Already earned from Supabase:', earnedIds.length)
    }
  } catch (e) {
    earnedAchievements = currentUser.achievements || []
    earnedIds = earnedAchievements.map(a => (typeof a === 'string' ? a : a.id))
    console.log('[Achievements] Using local earned list:', earnedIds.length)
  }

  const USERDATA_KEY = 'hqcmd_userData_v4'
  let allData
  try { allData = JSON.parse(localStorage.getItem(USERDATA_KEY) || '{}') } catch { return }

  const myData = allData[String(currentUser.id)] || {}
  const newlyEarned = []

  ACHIEVEMENTS.forEach(achievement => {
    if (earnedIds.includes(achievement.id)) return
    try {
      if (achievement.check(currentUser, myData, allData)) {
        newlyEarned.push({ id: achievement.id, earnedAt: new Date().toISOString() })
      }
    } catch (e) {
      console.warn('[Achievements] Check failed for:', achievement.id, e)
    }
  })

  if (newlyEarned.length === 0) return

  console.log('[Achievements] Newly earned:', newlyEarned.map(a => a.id))

  const updatedAchievements = [...earnedAchievements, ...newlyEarned]

  // Save to Supabase
  try {
    const { supabase } = await import('../lib/supabase')
    await supabase
      .from('users')
      .update({ achievements: updatedAchievements })
      .eq('id', String(currentUser.id))
    console.log('[Achievements] Saved to Supabase')
  } catch (e) {
    console.error('[Achievements] Supabase save failed:', e)
  }

  // Update currentUser state and localStorage
  const updatedUser = { ...currentUser, achievements: updatedAchievements }
  setCurrentUser(updatedUser)
  try { localStorage.setItem('hqcmd_currentUser_v3', JSON.stringify(updatedUser)) } catch {}

  // Update users array
  try {
    const users = JSON.parse(localStorage.getItem('hqcmd_users_v3') || '[]')
    localStorage.setItem('hqcmd_users_v3', JSON.stringify(
      users.map(u => String(u.id) === String(currentUser.id) ? { ...u, achievements: updatedAchievements } : u)
    ))
  } catch {}

  // Push notifications for newly earned only
  try {
    const freshData = JSON.parse(localStorage.getItem(USERDATA_KEY) || '{}')
    const slot = freshData[String(currentUser.id)]
    if (slot) {
      if (!Array.isArray(slot.notifications)) slot.notifications = []
      newlyEarned.forEach(earned => {
        const achievement = ACHIEVEMENTS.find(a => a.id === earned.id)
        if (!achievement) return
        slot.notifications.unshift({
          id: String(Date.now()) + '_ach_' + earned.id,
          iconType: 'message',
          type: 'achievement',
          text: `🏆 Achievement unlocked: ${achievement.icon} ${achievement.name} — ${achievement.flavour}`,
          time: 'Just now',
          read: false,
          timestamp: earned.earnedAt,
          link: `/profile/${currentUser.id}`,
        })
      })
      localStorage.setItem(USERDATA_KEY, JSON.stringify(freshData))
    }
  } catch {}

  return newlyEarned
}
