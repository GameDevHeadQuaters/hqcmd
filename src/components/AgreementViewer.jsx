import { useState } from 'react'
import {
  IconX, IconPrinter, IconCheck, IconClock, IconCircleCheck, IconCopy,
  IconSend, IconAlertTriangle,
} from '@tabler/icons-react'
import { AGREEMENT_DISCLAIMER } from '../utils/agreementDisclaimer'
import { crossUserPrepend } from '../utils/crossUserWrite'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'

function fillBody(body, fields) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => fields[key] || `[${key}]`)
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function isPendingCountersign(status) {
  return status === 'signed' || status === 'pending_countersign'
}

function isFullySigned(status) {
  return status === 'fully_signed'
}

function StatusIndicator({ status }) {
  const counterDone = isFullySigned(status)
  const counterCurrent = isPendingCountersign(status)

  const steps = [
    { label: 'Owner Signed',           done: true,           current: false },
    { label: counterDone ? 'Counterparty Signed' : 'Awaiting Countersignature',
                                        done: counterDone,    current: counterCurrent },
    { label: 'Fully Signed',           done: counterDone,    current: false },
  ]

  return (
    <div className="flex items-center mb-6">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center" style={{ flex: i < steps.length - 1 ? '1' : 'none' }}>
          <div className="flex flex-col items-center">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: step.done ? 'var(--status-success)' : step.current ? 'var(--status-warning)' : 'var(--bg-elevated)',
              }}
            >
              {step.done ? <IconCheck size={12} color="white" /> :
               step.current ? <IconClock size={12} color="white" /> :
               <span style={{ color: 'var(--text-tertiary)', fontSize: 10, fontWeight: 700 }}>{i + 1}</span>}
            </div>
            <span
              className="text-[10px] font-medium mt-1 text-center whitespace-nowrap"
              style={{ color: step.done ? 'var(--status-success)' : step.current ? 'var(--status-warning)' : 'var(--text-tertiary)' }}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className="flex-1 h-px mx-2"
              style={{ backgroundColor: step.done ? 'var(--status-success)' : 'var(--border-default)', marginBottom: 16 }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default function AgreementViewer({
  agreement,
  template,
  onClose,
  users,
  setAgreements,
  currentUser,
  onAddNotificationForUser,
  onAddDirectMessageForUser,
}) {
  const [live, setLive] = useState(agreement)
  const [cpName,  setCpName]  = useState(agreement.counterpartyName  ?? '')
  const [cpEmail, setCpEmail] = useState(agreement.counterpartyEmail ?? '')
  const [sendStatus, setSendStatus] = useState(null)
  const [linkCopied, setLinkCopied] = useState(false)

  const body = template ? fillBody(template.body, live.fields ?? {}) : ''

  function patchAgreement(patch) {
    const updated = { ...live, ...patch }
    setLive(updated)
    setAgreements?.(prev => (prev ?? []).map(a => a.id === updated.id ? updated : a))
    return updated
  }

  function generateToken() {
    return live.shareToken || (Date.now().toString(36) + Math.random().toString(36).slice(2))
  }

  function sendToInbox() {
    if (!cpName.trim() || !cpEmail.trim()) { setSendStatus('field_error'); return }
    const counterparty = (users ?? []).find(u => u.email?.toLowerCase() === cpEmail.trim().toLowerCase())
    if (!counterparty) { setSendStatus('no_user'); return }

    const token = generateToken()
    const updated = patchAgreement({ counterpartyName: cpName.trim(), counterpartyEmail: cpEmail.trim(), shareToken: token, sentToInbox: true })

    const notifText = `${currentUser?.name ?? 'Someone'} has sent you an agreement to sign: "${live.templateName}"`
    const dmObj = {
      id: Date.now(),
      type: 'agreement',
      agreementId: live.id,
      shareToken: token,
      fromName: currentUser?.name ?? 'HQCMD User',
      fromEmail: currentUser?.email ?? '',
      subject: `Agreement to sign: ${live.templateName}`,
      message: `${currentUser?.name ?? 'Someone'} has sent you an agreement to sign: "${live.templateName}". Click "Review & Sign" to view and sign it.`,
      timestamp: new Date().toISOString(),
      read: false,
    }

    // These now write directly to localStorage via crossUserPrepend (in App.jsx)
    onAddNotificationForUser?.(counterparty.id, { type: 'agreement', text: notifText, link: '/inbox' })
    onAddDirectMessageForUser?.(counterparty.id, dmObj)

    // Push a received-agreement copy so the recipient sees it in their Agreements page
    const receivedAgreement = {
      ...updated,
      id: String(updated.id) + '_recv_' + Date.now(),
      receivedAt: new Date().toISOString(),
      isReceived: true,
      status: 'awaiting_my_signature',
      read: false,
    }
    crossUserPrepend(String(counterparty.id), 'agreements', receivedAgreement)

    setSendStatus('sent')
  }

  function copyLink() {
    if (!cpName.trim() && !cpEmail.trim()) { setSendStatus('field_error'); return }
    const token = generateToken()
    patchAgreement({
      counterpartyName: cpName.trim() || live.counterpartyName || '',
      counterpartyEmail: cpEmail.trim() || live.counterpartyEmail || '',
      shareToken: token,
    })
    const url = window.location.origin + '/sign/' + token
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setSendStatus('copied')
      setTimeout(() => setLinkCopied(false), 3000)
    })
  }

  function printAgreement() {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${live.templateName}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; font-size: 13px; line-height: 1.8; color: #111827; max-width: 680px; margin: 60px auto; padding: 0 40px; }
    pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; line-height: 1.8; }
    h1 { font-size: 18px; margin-bottom: 8px; }
    .meta { font-size: 12px; color: #6b7280; margin-bottom: 40px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; }
    .sigs { display: flex; gap: 40px; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 24px; }
    .sig { flex: 1; }
    .disclaimer { font-size: 11px; color: #9ca3af; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px; }
    @media print { body { margin: 20px auto; } }
  </style>
</head>
<body>
  <h1>${live.templateName}</h1>
  <div class="meta">
    ${live.projectTitle ? `Project: <strong>${live.projectTitle}</strong> &nbsp;|&nbsp; ` : ''}
    Generated via HQCMD &nbsp;|&nbsp; ${formatDate(live.createdAt)}
  </div>
  <pre>${body}</pre>
  <div class="sigs">
    <div class="sig">
      <p style="font-size:12px;color:#6b7280;margin-bottom:4px;font-weight:600;">OWNER SIGNATURE</p>
      <p style="font-size:13px;">${live.signerName}</p>
      <p style="font-size:12px;color:#6b7280;">${live.signerEmail}</p>
      <p style="font-size:12px;color:#6b7280;">${formatDate(live.signedAt)}</p>
    </div>
    ${isFullySigned(live.status) ? `
    <div class="sig">
      <p style="font-size:12px;color:#6b7280;margin-bottom:4px;font-weight:600;">COUNTERPARTY SIGNATURE</p>
      <p style="font-size:13px;">${live.counterpartyName}</p>
      <p style="font-size:12px;color:#6b7280;">${live.counterpartyEmail}</p>
      <p style="font-size:12px;color:#6b7280;">${formatDate(live.counterpartySignedAt)}</p>
    </div>` : ''}
  </div>
  <div class="disclaimer">${AGREEMENT_DISCLAIMER}</div>
</body>
</html>`

    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  const inputStyle = {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div
        className="relative w-full max-w-2xl flex flex-col"
        style={{ backgroundColor: 'var(--bg-surface)', boxShadow: '-8px 0 40px rgba(0,0,0,0.4)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Agreement</p>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{live.templateName}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={printAgreement}
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full transition-colors"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
            >
              <IconPrinter size={15} />
              Print / PDF
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
            >
              <IconX size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <StatusIndicator status={live.status} />

          {/* Fully signed banner */}
          {isFullySigned(live.status) && (
            <div
              className="flex items-center gap-2 rounded-lg px-4 py-3 mb-5"
              style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}
            >
              <IconCircleCheck size={20} style={{ color: 'var(--status-success)', flexShrink: 0 }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--status-success)' }}>Fully Signed</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Both parties have signed this agreement
                </p>
              </div>
            </div>
          )}

          {/* Awaiting countersign banner */}
          {isPendingCountersign(live.status) && (
            <div
              className="flex items-center gap-2 rounded-lg px-4 py-3 mb-5"
              style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}
            >
              <IconClock size={18} style={{ color: 'var(--status-warning)', flexShrink: 0 }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--status-warning)' }}>Awaiting Countersignature</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Owner has signed — send to the counterparty below
                </p>
              </div>
            </div>
          )}

          {/* Meta */}
          {live.projectTitle && (
            <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
              Project: <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{live.projectTitle}</span>
            </p>
          )}

          {/* Agreement body */}
          <div className="rounded-lg p-5 mb-5" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <pre className="text-xs whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', color: 'var(--text-secondary)' }}>
              {body}
            </pre>
          </div>

          {/* Signature block(s) */}
          {isFullySigned(live.status) ? (
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="rounded-lg p-4" style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Owner Signature</p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{live.signerName}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{live.signerEmail}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{formatDate(live.signedAt)}</p>
              </div>
              <div className="rounded-lg p-4" style={{ border: '1px solid rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.07)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--status-success)' }}>Counterparty Signature</p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{live.counterpartyName}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{live.counterpartyEmail}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{formatDate(live.counterpartySignedAt)}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg p-4 mb-5" style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Owner Signature</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{live.signerName}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{live.signerEmail}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{formatDate(live.signedAt)}</p>
            </div>
          )}

          {/* Send for countersignature */}
          {isPendingCountersign(live.status) && (
            <div className="rounded-lg p-5" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Send for Countersignature</p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                Enter the counterparty's details to send them this agreement to sign.
              </p>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Counterparty Name</label>
                  <input
                    type="text"
                    className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors"
                    style={inputStyle}
                    placeholder="Full name"
                    value={cpName}
                    onChange={e => { setCpName(e.target.value); setSendStatus(null) }}
                    onFocus={e => (e.target.style.borderColor = ACCENT)}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Counterparty Email</label>
                  <input
                    type="email"
                    className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors"
                    style={inputStyle}
                    placeholder="email@example.com"
                    value={cpEmail}
                    onChange={e => { setCpEmail(e.target.value); setSendStatus(null) }}
                    onFocus={e => (e.target.style.borderColor = ACCENT)}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={sendToInbox}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-semibold text-white transition-colors"
                  style={{ backgroundColor: ACCENT }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
                >
                  <IconSend size={14} />
                  Send to Inbox
                </button>
                <button
                  onClick={copyLink}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-semibold transition-colors"
                  style={{ color: ACCENT, border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                >
                  {linkCopied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  {linkCopied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>

              {/* Status messages */}
              {sendStatus === 'sent' && (
                <div className="mt-3 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: 'var(--status-success)' }}>
                  <IconCheck size={13} />
                  Agreement sent to their HQCMD inbox successfully.
                </div>
              )}
              {sendStatus === 'copied' && (
                <div className="mt-3 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: 'var(--status-success)' }}>
                  <IconCheck size={13} />
                  Shareable link copied to clipboard. Share it with the counterparty.
                </div>
              )}
              {sendStatus === 'no_user' && (
                <div className="mt-3 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: 'var(--status-warning)', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <IconAlertTriangle size={13} />
                  No HQCMD account found with that email. Use "Copy Link" to share a signing link instead.
                </div>
              )}
              {sendStatus === 'field_error' && (
                <div className="mt-3 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--status-error)' }}>
                  <IconAlertTriangle size={13} />
                  Please enter both a name and email address.
                </div>
              )}

              {live.shareToken && sendStatus !== 'copied' && sendStatus !== 'sent' && (
                <p className="mt-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Signing link already generated.{' '}
                  <button
                    onClick={copyLink}
                    className="underline transition-colors"
                    style={{ color: 'var(--text-tertiary)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                  >
                    Copy it again
                  </button>
                </p>
              )}
            </div>
          )}

          <p className="text-xs mt-5 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            This agreement was generated using HQCMD templates. It is not a legally reviewed document.
            HQCMD accepts no responsibility for agreements made using these templates.
          </p>
        </div>
      </div>
    </div>
  )
}
