import { useState } from 'react'
import {
  IconX, IconChevronRight, IconChevronLeft, IconFileText,
  IconAlertTriangle, IconCheck, IconWritingSign, IconSend, IconCopy,
} from '@tabler/icons-react'
import { AGREEMENT_TEMPLATES } from '../utils/agreementTemplates'
import { AGREEMENT_DISCLAIMER } from '../utils/agreementDisclaimer'
import { sendEmail, agreementReceivedEmail } from '../utils/sendEmail'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'

const CATEGORY_LABELS = {
  compensation: 'Compensation',
  legal: 'Legal',
  partnership: 'Partnership',
}

const RECIPIENT_NAME_FIELDS = new Set(['collaboratorName', 'receivingParty', 'artistName', 'contractorName'])
const OWNER_NAME_FIELDS     = new Set(['ownerName', 'disclosingParty', 'founder1Name'])
const PROJECT_TITLE_FIELDS  = new Set(['projectTitle', 'companyName'])

function fillBody(body, fields) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => fields[key] || `[${key}]`)
}

function genToken() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function deliverAgreementToRecipient(recipientUserId, agreement) {
  alert('[DEBUG] deliverAgreementToRecipient called for: ' + (agreement.counterpartyEmail ?? recipientUserId))
  try {
    const key = 'hqcmd_userData_v4'
    const allData = JSON.parse(localStorage.getItem(key) || '{}')
    const uid = String(recipientUserId)
    if (!allData[uid]) {
      allData[uid] = { projects: [], applications: [], directMessages: [], notifications: [], agreements: [], contacts: [], sharedProjects: [] }
    }
    if (!Array.isArray(allData[uid].agreements)) {
      allData[uid].agreements = []
    }
    allData[uid].agreements = [agreement, ...allData[uid].agreements]
    localStorage.setItem(key, JSON.stringify(allData))
    return true
  } catch (err) {
    console.error('[deliverAgreementToRecipient] failed:', err)
    return false
  }
}

export default function AgreementSendModal({
  recipientName = '',
  recipientEmail = '',
  projectTitle = '',
  projectId,
  currentUser,
  users,
  setAgreements,
  onSave,
  onAddNotificationForUser,
  onAddDirectMessageForUser,
  onClose,
}) {
  const [template, setTemplate]               = useState(null)
  const [step, setStep]                       = useState(0)
  const [disclaimerChecked, setDisclaimer]    = useState(false)
  const [fields, setFields]                   = useState({})
  const [signerName, setSignerName]           = useState(currentUser?.name  ?? '')
  const [signerEmail, setSignerEmail]         = useState(currentUser?.email ?? '')
  const [signChecked, setSignChecked]         = useState(false)
  const [signing, setSigning]                 = useState(false)

  const [createdAgreement, setCreated]        = useState(null)
  const [cpName, setCpName]                   = useState(recipientName)
  const [cpEmail, setCpEmail]                 = useState(recipientEmail)
  const [sendStatus, setSendStatus]           = useState(null)
  const [linkCopied, setLinkCopied]           = useState(false)

  const grouped = AGREEMENT_TEMPLATES.reduce((acc, t) => {
    acc[t.category] = acc[t.category] ?? []
    acc[t.category].push(t)
    return acc
  }, {})

  function setField(id, value) {
    setFields(prev => ({ ...prev, [id]: value }))
  }

  function selectTemplate(t) {
    const prefill = {}
    for (const f of t.fields) {
      if (RECIPIENT_NAME_FIELDS.has(f.id))    prefill[f.id] = recipientName
      else if (OWNER_NAME_FIELDS.has(f.id))   prefill[f.id] = currentUser?.name ?? ''
      else if (PROJECT_TITLE_FIELDS.has(f.id)) prefill[f.id] = projectTitle
    }
    setTemplate(t)
    setFields(prefill)
    setStep(1)
  }

  function handleSign() {
    if (!signerName.trim() || !signerEmail.trim() || !signChecked || signing) return
    setSigning(true)
    const token = genToken()
    const agreement = {
      id: Date.now(),
      templateId: template.id,
      templateName: template.name,
      projectId: projectId ?? null,
      projectTitle: projectTitle || null,
      status: 'pending_countersign',
      fields,
      signerName: signerName.trim(),
      signerEmail: signerEmail.trim(),
      signedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      counterpartyName: cpName.trim(),
      counterpartyEmail: cpEmail.trim(),
      counterpartySignedAt: null,
      shareToken: token,
      sentToInbox: false,
    }
    setAgreements?.(prev => [agreement, ...(prev ?? [])])
    setCreated(agreement)
    onSave?.(agreement)
    setStep(4)
  }

  function sendToInbox() {
    console.log('[DELIVER] counterpartyEmail value:', cpEmail)
    if (!cpName.trim() || !cpEmail.trim()) { setSendStatus('field_error'); return }

    const allUsers = JSON.parse(localStorage.getItem('hqcmd_users_v3') || '[]')
    const counterparty = allUsers.find(u => u.email?.toLowerCase() === cpEmail.trim().toLowerCase())
    if (!counterparty) { setSendStatus('no_user'); return }

    const receivedAgreement = {
      ...createdAgreement,
      id: String(createdAgreement.id) + '_recv_' + Date.now(),
      counterpartyName: cpName.trim(),
      counterpartyEmail: cpEmail.trim(),
      receivedAt: new Date().toISOString(),
      isReceived: true,
      status: 'awaiting_my_signature',
      read: false,
    }
    deliverAgreementToRecipient(String(counterparty.id), receivedAgreement)

    const notifText = `${currentUser?.name ?? 'Someone'} has sent you an agreement to sign: "${createdAgreement.templateName}"`
    const dmObj = {
      id: Date.now(),
      type: 'agreement',
      agreementId: createdAgreement.id,
      shareToken: createdAgreement.shareToken,
      fromName: currentUser?.name ?? 'HQCMD User',
      fromEmail: currentUser?.email ?? '',
      subject: `Agreement to sign: ${createdAgreement.templateName}`,
      message: `${currentUser?.name ?? 'Someone'} has sent you an agreement to sign: "${createdAgreement.templateName}". Click "Review & Sign" to view and sign it.`,
      timestamp: new Date().toISOString(),
      read: false,
    }
    onAddNotificationForUser?.(counterparty.id, { type: 'agreement', text: notifText, link: '/inbox' })
    onAddDirectMessageForUser?.(counterparty.id, dmObj)

    const signLink = `${window.location.origin}/sign/${createdAgreement.shareToken}`
    const { subject, html } = agreementReceivedEmail(cpName.trim(), currentUser?.name ?? 'Someone', projectTitle, signLink)
    sendEmail({ to: cpEmail.trim(), subject, html })

    const updated = { ...createdAgreement, counterpartyName: cpName.trim(), counterpartyEmail: cpEmail.trim(), sentToInbox: true }
    setCreated(updated)
    setAgreements?.(prev => (prev ?? []).map(a => a.id === updated.id ? updated : a))
    setSendStatus('sent')
  }

  function copyLink() {
    if (!createdAgreement?.shareToken) return
    navigator.clipboard.writeText(window.location.origin + '/sign/' + createdAgreement.shareToken)
      .then(() => { setLinkCopied(true); setSendStatus('copied'); setTimeout(() => setLinkCopied(false), 3000) })
      .catch(() => {})
  }

  const previewText = template ? fillBody(template.body, fields) : ''
  const canSign     = !!(signerName.trim() && signerEmail.trim() && signChecked && !signing)
  const inputStyle  = { backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl flex flex-col" style={{ backgroundColor: 'var(--bg-surface)', boxShadow: '-8px 0 40px rgba(0,0,0,0.4)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {step === 0 ? 'Send Agreement' : `Step ${step} of 4`}{recipientName ? ` · ${recipientName}` : ''}
            </p>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {step === 0 && 'Choose a Template'}
              {step === 1 && 'Important Disclaimer'}
              {step === 2 && (template?.name ?? 'Fill in Details')}
              {step === 3 && 'Sign Agreement'}
              {step === 4 && 'Send for Countersignature'}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors" style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
            <IconX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Step 0: Template */}
          {step === 0 && (
            <div className="space-y-6">
              {Object.entries(grouped).map(([cat, templates]) => (
                <div key={cat}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    {CATEGORY_LABELS[cat] ?? cat}
                  </p>
                  <div className="space-y-2">
                    {templates.map(t => (
                      <button key={t.id} onClick={() => selectTemplate(t)}
                        className="w-full text-left p-4 rounded-lg transition-all"
                        style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.backgroundColor = 'var(--bg-surface)' }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.description}</p>
                          </div>
                          <IconChevronRight size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 1 }} />
                        </div>
                        <span className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--brand-accent-glow)', color: ACCENT }}>
                          {CATEGORY_LABELS[t.category] ?? t.category}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 1: Disclaimer */}
          {step === 1 && (
            <div>
              <div className="rounded-lg p-5 mb-6 flex gap-3" style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <IconAlertTriangle size={20} style={{ color: 'var(--status-warning)', flexShrink: 0, marginTop: 1 }} />
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{AGREEMENT_DISCLAIMER}</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <div onClick={() => setDisclaimer(v => !v)}
                  className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
                  style={{ borderColor: disclaimerChecked ? ACCENT : 'var(--border-strong)', backgroundColor: disclaimerChecked ? ACCENT : 'transparent', cursor: 'pointer' }}>
                  {disclaimerChecked && <IconCheck size={12} color="white" />}
                </div>
                <span className="text-sm leading-relaxed select-none" style={{ color: 'var(--text-secondary)' }}>
                  I have read and understood this disclaimer and accept that HQCMD bears no responsibility for agreements made using these templates.
                </span>
              </label>
            </div>
          )}

          {/* Step 2: Fields + preview */}
          {step === 2 && template && (
            <div>
              <div className="space-y-4 mb-8">
                {template.fields.map(f => (
                  <div key={f.id}>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      {f.label}{f.required && <span style={{ color: '#ed2793' }}> *</span>}
                    </label>
                    {f.type === 'textarea' ? (
                      <textarea rows={3} className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none transition-colors" style={inputStyle}
                        placeholder={f.placeholder} value={fields[f.id] ?? ''}
                        onChange={e => setField(f.id, e.target.value)}
                        onFocus={e => (e.target.style.borderColor = ACCENT)}
                        onBlur={e => (e.target.style.borderColor = 'var(--border-default)')} />
                    ) : (
                      <input type={f.type} className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors" style={inputStyle}
                        placeholder={f.placeholder} value={fields[f.id] ?? ''}
                        onChange={e => setField(f.id, e.target.value)}
                        onFocus={e => (e.target.style.borderColor = ACCENT)}
                        onBlur={e => (e.target.style.borderColor = 'var(--border-default)')} />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                <IconFileText size={13} /> Live Preview
              </p>
              <div className="rounded-lg p-5" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                <pre className="text-xs whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', color: 'var(--text-secondary)' }}>
                  {previewText}
                </pre>
              </div>
            </div>
          )}

          {/* Step 3: Sign */}
          {step === 3 && (
            <div>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Your Full Name <span style={{ color: '#ed2793' }}>*</span>
                  </label>
                  <input type="text" className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors" style={inputStyle}
                    placeholder="Enter your full legal name" value={signerName}
                    onChange={e => setSignerName(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = ACCENT)}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-default)')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Your Email Address <span style={{ color: '#ed2793' }}>*</span>
                  </label>
                  <input type="email" className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors" style={inputStyle}
                    placeholder="Enter your email address" value={signerEmail}
                    onChange={e => setSignerEmail(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = ACCENT)}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-default)')} />
                </div>
              </div>
              <label className="flex items-start gap-3 cursor-pointer mb-6">
                <div onClick={() => setSignChecked(v => !v)}
                  className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
                  style={{ borderColor: signChecked ? ACCENT : 'var(--border-strong)', backgroundColor: signChecked ? ACCENT : 'transparent', cursor: 'pointer' }}>
                  {signChecked && <IconCheck size={12} color="white" />}
                </div>
                <span className="text-sm leading-relaxed select-none" style={{ color: 'var(--text-secondary)' }}>
                  By signing, I confirm that I have read and agree to all terms in this agreement, and I accept the HQCMD disclaimer.
                </span>
              </label>
              <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Agreement Summary</p>
                <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>{template?.name}</p>
                {projectTitle && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Project: {projectTitle}</p>}
                {recipientName && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>For: {recipientName}</p>}
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Signing as: {signerName || '—'} ({signerEmail || '—'})</p>
              </div>
            </div>
          )}

          {/* Step 4: Send */}
          {step === 4 && createdAgreement && (
            <div>
              <div className="flex items-center gap-2 rounded-lg px-4 py-3 mb-6" style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
                <IconCheck size={16} style={{ color: 'var(--status-success)', flexShrink: 0 }} />
                <p className="text-xs font-medium" style={{ color: 'var(--status-success)' }}>
                  Agreement signed. Send it to <strong>{recipientName || 'the counterparty'}</strong> for countersignature.
                </p>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Counterparty Name</label>
                  <input type="text" className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors" style={inputStyle}
                    placeholder="Full name" value={cpName}
                    onChange={e => { setCpName(e.target.value); setSendStatus(null) }}
                    onFocus={e => (e.target.style.borderColor = ACCENT)}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-default)')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Counterparty Email <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>(HQCMD account email)</span>
                  </label>
                  <input type="email" className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors" style={inputStyle}
                    placeholder="email@example.com" value={cpEmail}
                    onChange={e => { setCpEmail(e.target.value); setSendStatus(null) }}
                    onFocus={e => (e.target.style.borderColor = ACCENT)}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-default)')} />
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <button onClick={sendToInbox}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-semibold text-white transition-colors"
                  style={{ backgroundColor: ACCENT }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}>
                  <IconSend size={14} /> Send to Inbox
                </button>
                <button onClick={copyLink}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-semibold transition-colors"
                  style={{ color: ACCENT, border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}>
                  {linkCopied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  {linkCopied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>

              {sendStatus === 'sent'        && <div className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg mb-2" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: 'var(--status-success)' }}><IconCheck size={13} /> Agreement sent to their HQCMD inbox.</div>}
              {sendStatus === 'copied'      && <div className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg mb-2" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: 'var(--status-success)' }}><IconCheck size={13} /> Link copied — share it with {cpName || 'the counterparty'}.</div>}
              {sendStatus === 'no_user'     && <div className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg mb-2" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: 'var(--status-warning)', border: '1px solid rgba(245,158,11,0.3)' }}><IconAlertTriangle size={13} /> No HQCMD account found with that email. Use "Copy Link" to share a signing link instead.</div>}
              {sendStatus === 'field_error' && <div className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg mb-2" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--status-error)' }}><IconAlertTriangle size={13} /> Please enter both a name and email address.</div>}

              <p className="text-xs mt-4" style={{ color: 'var(--text-tertiary)' }}>
                Agreement saved to your Agreements tab. You can view and resend it from there at any time.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between gap-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {step < 4 ? (
            <button onClick={() => setStep(s => Math.max(0, s - 1))}
              className="flex items-center gap-1.5 text-sm font-medium transition-colors"
              style={{ color: 'var(--text-secondary)', visibility: step === 0 ? 'hidden' : 'visible' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
              <IconChevronLeft size={16} /> Back
            </button>
          ) : <div />}

          {step === 0 && <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Select a template to continue</span>}
          {step === 1 && (
            <button onClick={() => { if (disclaimerChecked) setStep(2) }}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all"
              style={{ backgroundColor: disclaimerChecked ? ACCENT : 'var(--bg-elevated)', color: disclaimerChecked ? 'white' : 'var(--text-tertiary)', cursor: disclaimerChecked ? 'pointer' : 'not-allowed' }}
              onMouseEnter={e => { if (disclaimerChecked) e.currentTarget.style.backgroundColor = ACCENT_DARK }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = disclaimerChecked ? ACCENT : 'var(--bg-elevated)' }}>
              Continue <IconChevronRight size={16} />
            </button>
          )}
          {step === 2 && (
            <button onClick={() => setStep(3)}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-white transition-all"
              style={{ backgroundColor: ACCENT }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}>
              Next: Sign <IconChevronRight size={16} />
            </button>
          )}
          {step === 3 && (
            <button onClick={handleSign} disabled={!canSign}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all"
              style={{ backgroundColor: canSign ? ACCENT : 'var(--bg-elevated)', color: canSign ? 'white' : 'var(--text-tertiary)', cursor: canSign ? 'pointer' : 'not-allowed' }}
              onMouseEnter={e => { if (canSign) e.currentTarget.style.backgroundColor = ACCENT_DARK }}
              onMouseLeave={e => { if (canSign) e.currentTarget.style.backgroundColor = ACCENT }}>
              <IconWritingSign size={15} /> Sign Agreement
            </button>
          )}
          {step === 4 && (
            <button onClick={onClose}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-white transition-all"
              style={{ backgroundColor: ACCENT }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
