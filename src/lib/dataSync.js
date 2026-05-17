import { supabase } from './supabase'

export function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || ''))
}

// ===== PROJECTS =====
export async function syncProject(project, ownerId) {
  if (!ownerId || ownerId === 'superadmin') return

  try {
    const projectData = {
      id: isUUID(project.id) ? project.id : undefined,
      owner_id: String(ownerId),
      title: project.title,
      description: project.description || '',
      status: project.status || 'Planning',
      visibility: project.visibility || 'private',
      category: project.category || '',
      timeline: project.timeline || '',
      commitment: project.commitment || '',
      compensation: project.compensation || [],
      roles_needed: project.rolesNeeded || project.roles_needed || [],
      nda_required: project.ndaRequired || false,
      game_jam: project.gameJam || false,
      end_date: project.endDate || null,
      progress: project.progress || 0,
      gdd: project.gdd || {},
      story_studio: project.storyStudio || {},
      budget: project.budget || {}
    }

    const { data, error } = await supabase
      .from('projects')
      .upsert(projectData, { onConflict: 'id' })
      .select()
      .single()

    if (error) console.error('[Sync] Project error:', error)
    else console.log('[Sync] ✅ Project synced:', data.id)
    return data
  } catch(e) {
    console.error('[Sync] Project sync failed:', e)
  }
}

// ===== APPLICATIONS =====
export async function syncApplication(application, projectId, ownerId) {
  if (!ownerId || ownerId === 'superadmin') return

  try {
    const applicantId = String(application.applicantUserId || application.applicantId || '')
    if (!isUUID(applicantId)) {
      console.log('[Sync] Skipping application sync - applicantId not UUID:', applicantId)
      return
    }
    if (!isUUID(String(projectId))) {
      console.log('[Sync] Skipping application sync - projectId not UUID:', projectId)
      return
    }

    const { data, error } = await supabase
      .from('applications')
      .upsert({
        id: isUUID(String(application.id)) ? String(application.id) : undefined,
        project_id: String(projectId),
        applicant_id: applicantId,
        role: application.role || '',
        message: application.message || '',
        status: application.status || 'pending'
      }, { onConflict: 'project_id,applicant_id' })
      .select()
      .single()

    if (error) console.error('[Sync] Application error:', error)
    else console.log('[Sync] ✅ Application synced:', data?.id)
    return data
  } catch(e) {
    console.error('[Sync] Application sync failed:', e)
  }
}

export async function updateApplicationStatus(applicationId, projectId, status) {
  if (!isUUID(String(applicationId)) || !isUUID(String(projectId))) return

  try {
    const { error } = await supabase
      .from('applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', String(applicationId))

    if (error) console.error('[Sync] Application status error:', error)
    else console.log('[Sync] ✅ Application status updated:', status)
  } catch(e) {
    console.error('[Sync] Application status failed:', e)
  }
}

// ===== NOTIFICATIONS =====
export async function syncNotification(userId, notification) {
  if (!userId || userId === 'superadmin') return
  if (!isUUID(String(userId))) return

  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: String(userId),
        type: notification.type,
        message: notification.message,
        link: notification.link || null,
        read: false
      })

    if (error) console.error('[Sync] Notification error:', error)
    else console.log('[Sync] ✅ Notification synced for:', userId)
  } catch(e) {
    console.error('[Sync] Notification sync failed:', e)
  }
}

// ===== MESSAGES =====
export async function syncMessage(fromId, toId, subject, message, type, shareToken = null) {
  if (!isUUID(String(fromId)) || !isUUID(String(toId))) return

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        from_user_id: String(fromId),
        to_user_id: String(toId),
        subject,
        message,
        type: type || 'message',
        share_token: shareToken
      })
      .select()
      .single()

    if (error) console.error('[Sync] Message error:', error)
    else console.log('[Sync] ✅ Message synced')
    return data
  } catch(e) {
    console.error('[Sync] Message sync failed:', e)
  }
}

// ===== PROJECT MEMBERS =====
export async function syncProjectMember(projectId, userId, jobRole, accessRole) {
  if (!isUUID(String(projectId)) || !isUUID(String(userId))) return

  try {
    const { error } = await supabase
      .from('project_members')
      .upsert({
        project_id: String(projectId),
        user_id: String(userId),
        job_role: jobRole || '',
        access_role: accessRole || 'No Role'
      }, { onConflict: 'project_id,user_id' })

    if (error) console.error('[Sync] Member error:', error)
    else console.log('[Sync] ✅ Member synced:', userId)
  } catch(e) {
    console.error('[Sync] Member sync failed:', e)
  }
}

// ===== CHAT MESSAGES =====
export async function syncChatMessage(projectId, senderId, senderName, text) {
  if (!isUUID(String(projectId)) || !isUUID(String(senderId))) return

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        project_id: String(projectId),
        sender_id: String(senderId),
        sender_name: senderName,
        text
      })
      .select()
      .single()

    if (error) console.error('[Sync] Chat error:', error)
    else console.log('[Sync] ✅ Chat message synced')
    return data
  } catch(e) {
    console.error('[Sync] Chat sync failed:', e)
  }
}

// ===== AGREEMENTS =====
export async function syncAgreement(agreement, ownerId, recipientId) {
  if (!isUUID(String(ownerId))) return

  try {
    const { data, error } = await supabase
      .from('agreements')
      .upsert({
        id: isUUID(String(agreement.id)) ? String(agreement.id) : undefined,
        owner_id: String(ownerId),
        recipient_id: isUUID(String(recipientId)) ? String(recipientId) : null,
        template_name: agreement.templateName,
        project_title: agreement.projectTitle,
        content: agreement.content || agreement.generatedContent || '',
        share_token: agreement.shareToken,
        status: agreement.status || 'pending_countersign',
        owner_name: agreement.ownerName,
        owner_email: agreement.ownerEmail,
        counterparty_name: agreement.counterpartyName || null,
        counterparty_email: agreement.counterpartyEmail || null,
        end_date: agreement.endDate || null
      }, { onConflict: 'share_token' })
      .select()
      .single()

    if (error) console.error('[Sync] Agreement error:', error)
    else console.log('[Sync] ✅ Agreement synced:', data?.id)
    return data
  } catch(e) {
    console.error('[Sync] Agreement sync failed:', e)
  }
}

export async function updateAgreementStatus(shareToken, status, extraFields = {}) {
  try {
    const { error } = await supabase
      .from('agreements')
      .update({ status, ...extraFields, updated_at: new Date().toISOString() })
      .eq('share_token', shareToken)

    if (error) console.error('[Sync] Agreement status error:', error)
    else console.log('[Sync] ✅ Agreement status updated:', status)
  } catch(e) {
    console.error('[Sync] Agreement status failed:', e)
  }
}

// ===== MILESTONES =====
export async function syncMilestone(projectId, milestone) {
  if (!isUUID(String(projectId))) return

  try {
    const { error } = await supabase
      .from('milestones')
      .upsert({
        id: isUUID(String(milestone.id)) ? String(milestone.id) : undefined,
        project_id: String(projectId),
        name: milestone.name,
        date: milestone.date || null,
        completed: milestone.completed || false
      }, { onConflict: 'id' })

    if (error) console.error('[Sync] Milestone error:', error)
    else console.log('[Sync] ✅ Milestone synced')
  } catch(e) {
    console.error('[Sync] Milestone sync failed:', e)
  }
}
