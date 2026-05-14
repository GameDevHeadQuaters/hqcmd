export const ROLES = {
  OWNER:       'Owner',
  CO_LEADER:   'Co-leader',
  MEMBER:      'Member',
  CONTRIBUTOR: 'Contributor',
  OBSERVER:    'Observer',
}

const R = ROLES

export const PERMISSIONS = {
  EDIT_PROJECT:         [R.CO_LEADER],
  EDIT_PROJECT_PROFILE: [R.CO_LEADER],
  ADD_MILESTONES:       [R.CO_LEADER],
  MANAGE_MILESTONES:    [R.CO_LEADER],
  SCHEDULE_MEETING:     [R.CO_LEADER, R.MEMBER, R.CONTRIBUTOR],
  MANAGE_TEAM:          [],                                           // Owner only
  INVITE_MEMBER:        [R.CO_LEADER],
  MANAGE_BUDGET:        [R.CO_LEADER],
  ADD_TODO:             [R.CO_LEADER, R.MEMBER, R.CONTRIBUTOR],
  DELETE_TODO:          [R.CO_LEADER, R.MEMBER],
  ADD_LINK:             [R.CO_LEADER, R.MEMBER, R.CONTRIBUTOR],
  ADD_LINKS:            [R.CO_LEADER, R.MEMBER, R.CONTRIBUTOR],
  DELETE_LINK:          [R.CO_LEADER, R.MEMBER],
  TEAM_CHAT:            [R.CO_LEADER, R.MEMBER, R.CONTRIBUTOR],
  ADD_CONTENT:          [R.CO_LEADER, R.MEMBER, R.CONTRIBUTOR],
  EDIT_OWN_CONTENT:     [R.CO_LEADER, R.MEMBER, R.CONTRIBUTOR],
  EDIT_ANY_CONTENT:     [R.CO_LEADER, R.MEMBER],
  VIEW_APPS:            [R.CO_LEADER],
  VIEW_AGREEMENTS:      [R.CO_LEADER, R.MEMBER],
  DELETE_PROJECT:       [],                                           // Owner only
  REMOVE_MEMBER:        [R.CO_LEADER],
}

// Returns true if userRole can perform permission. Owner always can.
export function hasPermission(userRole, permission) {
  if (!userRole || userRole === R.OWNER) return true
  return (PERMISSIONS[permission] ?? []).includes(userRole)
}

// Returns true if actorRole can remove a member with targetRole.
export function canRemove(actorRole, targetRole) {
  if (actorRole === R.OWNER) return targetRole !== R.OWNER
  if (actorRole === R.CO_LEADER) return ![R.OWNER, R.CO_LEADER].includes(targetRole)
  return false
}
