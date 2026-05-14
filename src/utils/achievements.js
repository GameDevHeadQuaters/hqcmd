export const ACHIEVEMENTS = [
  // Getting Started
  { id: 'first_steps', icon: '🌱', name: 'First Steps', description: 'Complete your profile', flavour: 'Every legend starts somewhere.', path: 'general', check: (user) => !!(user.bio?.length > 20 && user.skills?.length > 0 && user.role) },
  { id: 'on_the_map', icon: '🎯', name: 'On the Map', description: 'Create your first project', flavour: 'Your vision is now reality.', path: 'general', check: (user, data) => (data.projects?.length || 0) > 0 },
  { id: 'social_butterfly', icon: '👋', name: 'Social Butterfly', description: 'Send your first message', flavour: 'Connection is everything.', path: 'general', check: (user, data, allData) => Object.keys(allData).some(uid => (allData[uid]?.directMessages || []).some(m => m.fromName === user.name || String(m.fromUserId) === String(user.id))) },
  { id: 'explorer', icon: '🔍', name: 'Explorer', description: 'Browse open projects', flavour: 'Opportunity favours the curious.', path: 'general', check: (user, data) => data.onboarding?.steps?.browsedProjects === true },
  { id: 'team_player', icon: '🤝', name: 'Team Player', description: 'Join your first project', flavour: 'Better together.', path: 'general', check: (user, data) => (data.sharedProjects?.length || 0) > 0 },

  // Profile
  { id: 'specialist', icon: '🧠', name: 'Specialist', description: 'Add 5+ skills to your profile', flavour: 'You know your craft.', path: 'general', check: (user) => (user.skills?.length || 0) >= 5 },
  { id: 'master_of_many', icon: '⚡', name: 'Master of Many', description: 'Add 10+ skills', flavour: 'Renaissance dev.', path: 'general', check: (user) => (user.skills?.length || 0) >= 10 },
  { id: 'going_public', icon: '🌍', name: 'Going Public', description: 'Set a project to Public', flavour: 'The world is watching.', path: 'general', check: (user, data) => (data.projects || []).some(p => p.visibility?.toLowerCase() === 'public') },

  // Projects
  { id: 'milestone_maker', icon: '✅', name: 'Milestone Maker', description: 'Complete your first milestone', flavour: 'One step at a time.', path: 'general', check: (user, data) => (data.projects || []).some(p => (p.milestones || []).some(m => m.completed)) },
  { id: 'roadmapper', icon: '🗺️', name: 'Roadmapper', description: 'Set 5+ milestones on a project', flavour: 'You plan to win.', path: 'general', check: (user, data) => (data.projects || []).some(p => (p.milestones || []).length >= 5) },
  { id: 'ship_it', icon: '🏁', name: 'Ship It!', description: 'Mark a project as Complete', flavour: 'Shipped. Legendary.', path: 'general', check: (user, data) => (data.projects || []).some(p => p.status === 'Complete') },
  { id: 'game_jam_hero', icon: '🎮', name: 'Game Jam Hero', description: 'Submit a project to a game jam', flavour: '48 hours. No sleep. Worth it.', path: 'general', check: (user, data) => (data.projects || []).some(p => p.gameJam === true) },

  // Collaboration
  { id: 'recruiter', icon: '📣', name: 'Recruiter', description: 'Add your first team member', flavour: 'You spotted talent.', path: 'general', check: (user, data) => (data.projects || []).some(p => (p.members || []).length > 0) },
  { id: 'squad_goals', icon: '👥', name: 'Squad Goals', description: 'Have 4+ people on your team', flavour: "The gang's all here.", path: 'solo_dev', check: (user, data) => (data.projects || []).some(p => (p.members || []).length >= 4) },
  { id: 'dream_team', icon: '🌟', name: 'Dream Team', description: 'Have 8+ people on your team', flavour: 'You built something special.', path: 'studio', check: (user, data) => (data.projects || []).some(p => (p.members || []).length >= 8) },
  { id: 'by_the_book', icon: '📝', name: 'By the Book', description: 'Send your first agreement', flavour: 'Professional from day one.', path: 'general', check: (user, data) => (data.agreements || []).some(a => !a.isReceived) },
  { id: 'signed_sealed', icon: '✍️', name: 'Signed & Sealed', description: 'Have an agreement fully signed', flavour: "It's official.", path: 'general', check: (user, data) => (data.agreements || []).some(a => a.status === 'fully_signed') },

  // Freelancer Path
  { id: 'free_agent', icon: '🦅', name: 'Free Agent', description: 'Join 3 different projects as a collaborator', flavour: 'Your skills are in demand.', path: 'freelancer', check: (user, data) => (data.sharedProjects?.length || 0) >= 3 },
  { id: 'multi_hyphenate', icon: '🎭', name: 'Multi-Hyphenate', description: 'Work across 3 different skill categories', flavour: 'Genre: undefined.', path: 'freelancer', check: (user) => (user.skills?.length || 0) >= 6 },
  { id: 'networker', icon: '🌐', name: 'Networker', description: 'Have 10+ contacts', flavour: 'You know everyone.', path: 'freelancer', check: (user, data) => (data.contacts?.length || 0) >= 10 },
  { id: 'portfolio_career', icon: '💼', name: 'Portfolio Career', description: 'Be active on 3 projects simultaneously', flavour: 'Spinning plates like a pro.', path: 'freelancer', check: (user, data) => (data.sharedProjects?.length || 0) >= 3 },

  // Solo Dev Path
  { id: 'solo_founder', icon: '🏰', name: 'Solo Founder', description: 'Own 2+ projects', flavour: 'Building empires, one project at a time.', path: 'solo_dev', check: (user, data) => (data.projects?.length || 0) >= 2 },
  { id: 'director', icon: '🎬', name: 'Director', description: 'Own a project with 5+ team members', flavour: 'Lights, camera, collaborate.', path: 'solo_dev', check: (user, data) => (data.projects || []).some(p => (p.members || []).length >= 5) },
  { id: 'numbers_person', icon: '📊', name: 'Numbers Person', description: 'Log 10+ budget transactions', flavour: 'You keep the books straight.', path: 'solo_dev', check: (user, data) => (data.projects || []).some(p => (p.budget?.transactions?.length || 0) >= 10) },
  { id: 'backer', icon: '💰', name: 'Backer', description: 'Set up a budget on a project', flavour: 'Money talks.', path: 'solo_dev', check: (user, data) => (data.projects || []).some(p => (p.budget?.total ?? 0) > 0) },

  // Studio Path
  { id: 'studio_rising', icon: '🏢', name: 'Studio Rising', description: 'Own 3 projects simultaneously', flavour: 'The studio is open for business.', path: 'studio', check: (user, data) => (data.projects?.length || 0) >= 3 },
  { id: 'talent_scout', icon: '🌟', name: 'Talent Scout', description: 'Send 5+ agreements to collaborators', flavour: 'You build careers.', path: 'studio', check: (user, data) => (data.agreements || []).filter(a => !a.isReceived).length >= 5 },
  { id: 'studio_boss', icon: '🏆', name: 'Studio Boss', description: 'Have 10+ total team members across all projects', flavour: 'The boss has entered the chat.', path: 'studio', check: (user, data) => { const total = (data.projects || []).reduce((sum, p) => sum + (p.members?.length || 0), 0); return total >= 10 } },

  // Special
  { id: 'beta_pioneer', icon: '🧪', name: 'Beta Pioneer', description: 'One of the first 50 users on HQCMD', flavour: 'You were here before it was cool.', path: 'special', check: (user) => { try { const users = JSON.parse(localStorage.getItem('hqcmd_users_v3') || '[]'); const idx = users.findIndex(u => String(u.id) === String(user.id)); return idx !== -1 && idx < 50 } catch { return false } } },
  { id: 'speed_runner', icon: '⚡', name: 'Speed Runner', description: 'Complete all onboarding in one session', flavour: 'No time to waste.', path: 'special', check: (user, data) => { const steps = data.onboarding?.steps || {}; return Object.keys(steps).length >= 5 && Object.values(steps).every(Boolean) } },
  { id: 'nda_protected', icon: '🔐', name: 'NDA Protected', description: 'Require NDA on a project', flavour: 'Your IP is safe.', path: 'special', check: (user, data) => (data.projects || []).some(p => p.ndaRequired === true) },
]

export const ACHIEVEMENT_PATHS = {
  general:    { name: 'General',    color: '#534AB7' },
  freelancer: { name: 'Freelancer', color: '#ed2793' },
  solo_dev:   { name: 'Solo Dev',   color: '#805da8' },
  studio:     { name: 'Studio',     color: '#22c55e' },
  special:    { name: 'Special',    color: '#f59e0b' },
}
