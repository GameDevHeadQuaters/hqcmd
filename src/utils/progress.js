export function calculateProgress(project) {
  const milestones = project.milestones ?? []
  const total = milestones.length
  const done = milestones.filter(m => m.done).length

  const hasMilestones = total > 0
  const milestoneScore = hasMilestones ? (done / total) * 100 : 0

  const endDate = project.endDate ? new Date(project.endDate + 'T23:59:59') : null
  const createdAt = project.createdAt ? new Date(project.createdAt) : null

  let timelineScore = 0
  let hasTimeline = false

  if (endDate && createdAt && endDate > createdAt) {
    const now = new Date()
    const span = endDate - createdAt
    const elapsed = now - createdAt
    timelineScore = Math.min(Math.max((elapsed / span) * 100, 0), 100)
    hasTimeline = true
  }

  let progress
  if (!hasMilestones && !hasTimeline) {
    progress = 0
  } else if (!hasMilestones) {
    progress = timelineScore
  } else if (!hasTimeline) {
    progress = milestoneScore
  } else {
    progress = milestoneScore * 0.7 + timelineScore * 0.3
  }

  return Math.round(progress)
}

export function getProjectStatus(project) {
  const milestones = project.milestones ?? []
  const allComplete = milestones.length > 0 && milestones.every(m => m.done)
  const endDate = project.endDate ? new Date(project.endDate + 'T23:59:59') : null
  const isPastDue = endDate !== null && new Date() > endDate
  const progress = calculateProgress(project)

  if (allComplete) return 'Complete'
  if (isPastDue) return 'Overtime'
  if (progress > 0) return 'In Progress'
  return 'Planning'
}
