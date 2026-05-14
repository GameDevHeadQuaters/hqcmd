import { ACHIEVEMENTS } from './achievements'

export function checkAndAwardAchievements(currentUser, setCurrentUser) {
  if (!currentUser || currentUser.isAdmin) return []

  const USERDATA_KEY = 'hqcmd_userData_v4'
  let allData
  try {
    allData = JSON.parse(localStorage.getItem(USERDATA_KEY) || '{}')
  } catch { return [] }

  const myData = allData[String(currentUser.id)] || {}
  const earnedIds = (currentUser.achievements || []).map(a => (typeof a === 'string' ? a : a.id))
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

  if (newlyEarned.length === 0) return []

  const updatedAchievements = [
    ...(currentUser.achievements || []),
    ...newlyEarned,
  ]

  // Update currentUser state + session storage
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

  // Push a notification for each new achievement
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

  console.log('[Achievements] Newly earned:', newlyEarned.map(a => a.id))
  return newlyEarned
}
