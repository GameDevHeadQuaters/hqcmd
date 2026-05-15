export const ROLES = {
  OWNER:       'Owner',
  COLEADER:    'Co-leader',
  CO_LEADER:   'Co-leader', // backward-compat alias
  MEMBER:      'Member',
  CONTRIBUTOR: 'Contributor',
  OBSERVER:    'Observer',
}

export const PERMISSIONS = {
  // Core access
  VIEW_PROJECT:         ['Owner', 'Co-leader', 'Member', 'Contributor', 'Observer'],
  TEAM_CHAT:            ['Owner', 'Co-leader', 'Member', 'Contributor'],
  ADD_CONTENT:          ['Owner', 'Co-leader', 'Member', 'Contributor'],
  ADD_LINKS:            ['Owner', 'Co-leader', 'Member'],
  CLAIM_TASKS:          ['Owner', 'Co-leader', 'Member', 'Contributor'],
  EDIT_OWN_CONTENT:     ['Owner', 'Co-leader', 'Member', 'Contributor'],
  EDIT_ANY_CONTENT:     ['Owner', 'Co-leader', 'Member'],
  EDIT_PROJECT_PROFILE: ['Owner', 'Co-leader'],
  MANAGE_MILESTONES:    ['Owner', 'Co-leader'],
  MANAGE_BUDGET:        ['Owner', 'Co-leader'],
  SEND_AGREEMENTS:      ['Owner', 'Co-leader'],
  MANAGE_APPLICATIONS:  ['Owner', 'Co-leader'],
  CHANGE_MEMBER_ROLES:  ['Owner', 'Co-leader'],
  REMOVE_MEMBERS:       ['Owner', 'Co-leader'],
  DELETE_PROJECT:       ['Owner'],
  CLOSE_PROJECT:        ['Owner'],
  CHANGE_VISIBILITY:    ['Owner'],
  // Legacy keys used by existing components — kept for backward compatibility
  EDIT_PROJECT:         ['Co-leader'],
  ADD_MILESTONES:       ['Co-leader'],
  SCHEDULE_MEETING:     ['Co-leader', 'Member', 'Contributor'],
  MANAGE_TEAM:          ['Co-leader'],
  INVITE_MEMBER:        ['Co-leader'],
  ADD_TODO:             ['Co-leader', 'Member', 'Contributor'],
  DELETE_TODO:          ['Co-leader', 'Member'],
  ADD_LINK:             ['Co-leader', 'Member', 'Contributor'],
  DELETE_LINK:          ['Co-leader', 'Member'],
  VIEW_APPS:            ['Co-leader'],
  VIEW_AGREEMENTS:      ['Co-leader', 'Member'],
  REMOVE_MEMBER:        ['Co-leader'],
}

export function normaliseRole(role) {
  if (!role || role === 'No Role') return role || 'No Role'
  const map = {
    'co-leader':   'Co-leader',
    'coleader':    'Co-leader',
    'co leader':   'Co-leader',
    'owner':       'Owner',
    'member':      'Member',
    'contributor': 'Contributor',
    'observer':    'Observer',
  }
  return map[role.toLowerCase().trim()] || role
}

export function hasPermission(userRole, permission) {
  const normalised = normaliseRole(userRole)
  if (!userRole || normalised === 'Owner') return true
  const effectiveRole = normalised === 'No Role' ? 'Observer' : normalised
  return (PERMISSIONS[permission] || []).includes(effectiveRole)
}

// Co-leader can manage Members/Contributors/Observers only.
// Owner can manage everyone except themselves (enforced at call site with isSelf).
export function canManageMember(managerRole, targetRole) {
  const mgr = normaliseRole(managerRole)
  const tgt = normaliseRole(targetRole)
  if (mgr === 'Owner') return tgt !== 'Owner'
  if (mgr === 'Co-leader') return !['Owner', 'Co-leader'].includes(tgt)
  return false
}

export function canChangeOwnRole() {
  return false
}

// Kept for backward compat with existing callers
export function canRemove(actorRole, targetRole) {
  return canManageMember(actorRole, targetRole)
}
