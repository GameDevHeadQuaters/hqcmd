import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AGREEMENT_TEMPLATES } from '../utils/agreementTemplates'
import { AGREEMENT_DISCLAIMER } from '../utils/agreementDisclaimer'
import {
  IconCircleCheck, IconAlertTriangle, IconCheck,
  IconWritingSign, IconPrinter,
} from '@tabler/icons-react'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'

function fillBody(body, fields) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => fields[key] || `[${key}]`)
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function StatusBar({ step }) {
  const steps = ['Owner Signed', 'Your Signature', 'Fully Signed']
  return (
    <div className="flex items-center mb-8">
      {steps.map((label, i) => {
        const done = i < step
        const current = i === step
        return (
          <div key={i} className="flex items-center" style={{ flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div className="flex flex-col items-center">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: done ? 'var(--status-success)' : current ? ACCENT : 'var(--bg-elevated)',
                }}
              >
                {done
                  ? <IconCheck size={13} color="white" />
                  : current
                    ? <IconWritingSign size={13} color="white" />
                    : <span style={{ color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>}
              </div>
              <span className="text-[10px] font-medium mt-1 text-center whitespace-nowrap"
                style={{ color: done ? 'var(--status-success)' : current ? ACCENT : 'var(--text-tertiary)' }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-px mx-2" style={{ backgroundColor: done ? 'var(--status-success)' : 'var(--border-default)', marginBottom: 16 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Branding() {
  return (
    <div className="mb-8">
      <img src="/logos/logo-cmd.png" alt="HQCMD" style={{ height: '28px', width: 'auto' }} onError={e => { e.target.style.display = 'none' }} />
    </div>
  )
}

export default function SignAgreement({ userData, onCountersign, onNotifyOwner }) {
  const { token } = useParams()
  const navigate = useNavigate()

  const [pageState, setPageState] = useState('loading')
  const [found, setFound] = useState(null)

  const [signerName,   setSignerName]   = useState('')
  const [signerEmail,  setSignerEmail]  = useState('')
  const [readChecked,  setReadChecked]  = useState(false)
  const [iAgree,       setIAgree]       = useState('')
  const [signing,      setSigning]      = useState(false)

  const [signedAgreement, setSignedAgreement] = useState(null)

  useEffect(() => {
    let result = null

    // Search React state first (already deserialized, fast)
    for (const [uid, data] of Object.entries(userData ?? {})) {
      const ag = (data.agreements ?? []).find(a => a.shareToken === token)
      if (ag) { result = { ownerId: uid, agreement: ag }; break }
    }

    // Fallback: read directly from localStorage in case React state is stale
    if (!result) {
      try {
        const raw = localStorage.getItem('hqcmd_userData_v4')
        if (raw) {
          const allUD = JSON.parse(raw)
          for (const [uid, data] of Object.entries(allUD)) {
            const ag = (data.agreements ?? []).find(a => a.shareToken === token)
            if (ag) { result = { ownerId: uid, agreement: ag }; break }
          }
        }
      } catch {}
    }

    if (!result) { setPageState('not_found'); return }

    const template = AGREEMENT_TEMPLATES.find(t => t.id === result.agreement.templateId) ?? null
    setFound({ ...result, template })

    if (result.agreement.status === 'fully_signed') {
      setPageState('already_signed')
    } else {
      setPageState('pending')
    }
  }, [token, userData])

  function handleSign() {
    if (!signerName.trim() || !signerEmail.trim() || !readChecked || iAgree.trim() !== 'I AGREE') return
    setSigning(true)

    const counterpartySignedAt = new Date().toISOString()
    const { ownerId, agreement } = found

    const countersignPatch = {
      counterpartyName: signerName.trim(),
      counterpartyEmail: signerEmail.trim(),
      counterpartySignedAt,
      status: 'fully_signed',
    }

    // Update React state so any same-session tab sees the change
    onCountersign(ownerId, agreement.id, countersignPatch)
    onNotifyOwner?.(ownerId, {
      type: 'agreement',
      text: `${signerName.trim()} has signed your agreement: "${agreement.templateName}"`,
      link: '/agreements',
    })

    // Write directly to localStorage so the owner's next session sees it immediately
    try {
      const raw = localStorage.getItem('hqcmd_userData_v4')
      if (raw) {
        const allUD = JSON.parse(raw)
        const ownerKey = String(ownerId)
        if (allUD[ownerKey]) {
          allUD[ownerKey].agreements = (allUD[ownerKey].agreements ?? []).map(a =>
            a.id === agreement.id ? { ...a, ...countersignPatch } : a
          )
          allUD[ownerKey].notifications = [
            {
              id: Date.now(),
              iconType: 'agreement',
              text: `${signerName.trim()} has signed your agreement: "${agreement.templateName}"`,
              time: 'Just now',
              read: false,
              link: '/agreements',
            },
            ...(allUD[ownerKey].notifications ?? []),
          ]
        }
        // Update the received copy in the signer's agreements so it no longer appears in "to sign"
        const allUsers = JSON.parse(localStorage.getItem('hqcmd_users_v3') || '[]')
        const signer = allUsers.find(u =>
          u.email?.toLowerCase().trim() === signerEmail.trim().toLowerCase()
        )
        if (signer) {
          const signerId = String(signer.id)
          const signerAgreements = allUD[signerId]?.agreements || []
          const receivedIdx = signerAgreements.findIndex(a =>
            a.shareToken === token && a.isReceived === true
          )
          if (receivedIdx !== -1) {
            allUD[signerId].agreements[receivedIdx].status = 'fully_signed'
            allUD[signerId].agreements[receivedIdx].signedAt = counterpartySignedAt
          }
        }
        localStorage.setItem('hqcmd_userData_v4', JSON.stringify(allUD))

        // Brute-force scan: ensure every copy (owner + received) with this token is marked fully_signed
        const freshData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
        Object.keys(freshData).forEach(uid => {
          ;(freshData[uid]?.agreements || []).forEach((a, idx) => {
            if (a.shareToken === token) {
              freshData[uid].agreements[idx].status = 'fully_signed'
              if (a.isReceived) {
                freshData[uid].agreements[idx].signedAt = new Date().toISOString()
              } else {
                freshData[uid].agreements[idx].counterpartyName = signerName.trim()
                freshData[uid].agreements[idx].counterpartyEmail = signerEmail.trim()
                freshData[uid].agreements[idx].counterpartySignedAt = new Date().toISOString()
              }
            }
          })
        })
        localStorage.setItem('hqcmd_userData_v4', JSON.stringify(freshData))
      }
    } catch (e) {
      console.warn('hqcmd: failed to write countersignature to localStorage', e)
    }

    setSignedAgreement({ ...agreement, ...countersignPatch })
    setPageState('success')
  }

  function printCopy() {
    const ag = signedAgreement ?? found?.agreement
    const tmpl = found?.template
    if (!ag || !tmpl) return
    const body = fillBody(tmpl.body, ag.fields ?? {})

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${ag.templateName}</title>
  <style>
    body { font-family: Georgia, serif; font-size: 13px; line-height: 1.8; color: #111827; max-width: 680px; margin: 60px auto; padding: 0 40px; }
    pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; }
    h1 { font-size: 18px; }
    .meta { font-size: 12px; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 32px; }
    .sigs { display: flex; gap: 40px; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 24px; }
    .sig { flex: 1; }
    .disclaimer { font-size: 11px; color: #9ca3af; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px; }
  </style>
</head>
<body>
  <h1>${ag.templateName}</h1>
  <div class="meta">Generated via HQCMD &nbsp;|&nbsp; ${formatDate(ag.createdAt)}</div>
  <pre>${body}</pre>
  <div class="sigs">
    <div class="sig">
      <p style="font-size:12px;color:#6b7280;font-weight:600;">OWNER SIGNATURE</p>
      <p>${ag.signerName}</p>
      <p style="font-size:12px;color:#6b7280;">${ag.signerEmail}</p>
      <p style="font-size:12px;color:#6b7280;">${formatDate(ag.signedAt)}</p>
    </div>
    <div class="sig">
      <p style="font-size:12px;color:#6b7280;font-weight:600;">COUNTERPARTY SIGNATURE</p>
      <p>${ag.counterpartyName}</p>
      <p style="font-size:12px;color:#6b7280;">${ag.counterpartyEmail}</p>
      <p style="font-size:12px;color:#6b7280;">${formatDate(ag.counterpartySignedAt)}</p>
    </div>
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

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)' }}>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading agreement…</p>
      </div>
    )
  }

  if (pageState === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)' }}>
        <div className="max-w-md text-center">
          <Branding />
          <div className="w-14 h-14 rounded-lg flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
            <IconAlertTriangle size={28} style={{ color: 'var(--status-warning)' }} />
          </div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Link Invalid or Expired</h1>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            This signing link is invalid or has expired. Please contact the person who sent it to request a new link.
          </p>
          <button
            onClick={() => navigate('/')}
            className="text-sm font-semibold px-5 py-2.5 rounded-full text-white transition-colors"
            style={{ backgroundColor: ACCENT }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
          >
            Go to HQCMD Home
          </button>
        </div>
      </div>
    )
  }

  if (pageState === 'already_signed') {
    const ag = found.agreement
    return (
      <div className="min-h-screen flex items-center justify-center px-6"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)' }}>
        <div className="max-w-md text-center">
          <Branding />
          <IconCircleCheck size={52} style={{ color: 'var(--status-success)', marginBottom: 16 }} />
          <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Already Fully Signed</h1>
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
            This agreement was signed by both parties.
          </p>
          <p className="text-xs mb-6" style={{ color: 'var(--text-tertiary)' }}>
            Counterparty signed: {formatDate(ag.counterpartySignedAt)}
          </p>
          <button
            onClick={() => navigate('/')}
            className="text-sm font-semibold px-5 py-2.5 rounded-full text-white transition-colors"
            style={{ backgroundColor: ACCENT }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
          >
            Go to HQCMD
          </button>
        </div>
      </div>
    )
  }

  if (pageState === 'success') {
    const ag = signedAgreement
    return (
      <div className="min-h-screen flex items-center justify-center px-6"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)' }}>
        <div className="max-w-md text-center">
          <Branding />
          <IconCircleCheck size={64} style={{ color: ACCENT, marginBottom: 16 }} />
          <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Agreement Signed!</h1>
          <p className="text-sm mb-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Thank you, <strong>{ag.counterpartyName}</strong>. This agreement is now fully signed by both parties.
          </p>
          <p className="text-xs mb-8" style={{ color: 'var(--text-tertiary)' }}>
            Signed on {formatDateTime(ag.counterpartySignedAt)}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={printCopy}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: ACCENT }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
            >
              <IconPrinter size={16} />
              Download a Copy
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-2.5 rounded-full text-sm font-semibold transition-colors"
              style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
            >
              Go to HQCMD Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  const { agreement, template } = found
  const bodyText = template ? fillBody(template.body, agreement.fields ?? {}) : ''
  const canSign = signerName.trim() && signerEmail.trim() && readChecked && iAgree.trim() === 'I AGREE' && !signing

  return (
    <div className="min-h-screen" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Branding />

        {/* Disclaimer */}
        <div
          className="rounded-lg p-4 mb-6 flex gap-3"
          style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}
        >
          <IconAlertTriangle size={18} style={{ color: 'var(--status-warning)', flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{AGREEMENT_DISCLAIMER}</p>
        </div>

        {/* Agreement title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{agreement.templateName}</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Sent by <strong>{agreement.signerName}</strong>
            {agreement.projectTitle ? ` · Project: ${agreement.projectTitle}` : ''}
          </p>
        </div>

        {/* Status bar */}
        <StatusBar step={1} />

        {/* Agreement body */}
        <div className="rounded-lg p-6 mb-6" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <pre className="text-xs whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', maxHeight: 320, overflowY: 'auto', color: 'var(--text-secondary)' }}>
            {bodyText}
          </pre>
        </div>

        {/* Owner already signed */}
        <div className="rounded-lg p-4 mb-6" style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Owner Signature</p>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{agreement.signerName}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{agreement.signerEmail}</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatDate(agreement.signedAt)}</p>
        </div>

        {/* Signing form */}
        <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <IconWritingSign size={18} style={{ color: ACCENT }} />
            Your Signature
          </h2>

          <div className="space-y-4 mb-5">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Full Name <span style={{ color: '#ed2793' }}>*</span>
              </label>
              <input
                type="text"
                className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                placeholder="Enter your full legal name"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                onFocus={e => (e.target.style.borderColor = ACCENT)}
                onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Email Address <span style={{ color: '#ed2793' }}>*</span>
              </label>
              <input
                type="email"
                className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                placeholder="your@email.com"
                value={signerEmail}
                onChange={e => setSignerEmail(e.target.value)}
                onFocus={e => (e.target.style.borderColor = ACCENT)}
                onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
              />
            </div>
          </div>

          {/* Read checkbox */}
          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <div
              onClick={() => setReadChecked(v => !v)}
              className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
              style={{
                borderColor: readChecked ? ACCENT : 'var(--border-strong)',
                backgroundColor: readChecked ? ACCENT : 'transparent',
                cursor: 'pointer',
              }}
            >
              {readChecked && <IconCheck size={12} color="white" />}
            </div>
            <span className="text-sm leading-relaxed select-none" style={{ color: 'var(--text-secondary)' }}>
              I have read the full agreement above and understand its terms. I accept the HQCMD disclaimer
              and understand this is not a legally verified document.
            </span>
          </label>

          {/* I AGREE field */}
          <div className="mb-5">
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              Type <span className="font-mono font-bold">I AGREE</span> to confirm your digital signature <span style={{ color: '#ed2793' }}>*</span>
            </label>
            <input
              type="text"
              className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors font-mono"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="I AGREE"
              value={iAgree}
              onChange={e => setIAgree(e.target.value)}
              onFocus={e => (e.target.style.borderColor = ACCENT)}
              onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
            />
          </div>

          <button
            onClick={handleSign}
            disabled={!canSign}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-sm font-semibold text-white transition-all"
            style={{
              backgroundColor: canSign ? ACCENT : 'var(--bg-elevated)',
              color: canSign ? 'white' : 'var(--text-tertiary)',
              cursor: canSign ? 'pointer' : 'not-allowed',
            }}
            onMouseEnter={e => { if (canSign) e.currentTarget.style.backgroundColor = ACCENT_DARK }}
            onMouseLeave={e => { if (canSign) e.currentTarget.style.backgroundColor = ACCENT }}
          >
            <IconWritingSign size={17} />
            {signing ? 'Signing…' : 'Sign Agreement'}
          </button>

          {!canSign && (iAgree.length > 0 && iAgree.trim() !== 'I AGREE') && (
            <p className="text-xs text-center mt-2" style={{ color: 'var(--status-error)' }}>
              Please type exactly "I AGREE" to continue.
            </p>
          )}
        </div>

        <p className="text-xs text-center mt-6 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          Powered by HQCMD · This is not a legally verified document. Seek independent legal advice for binding agreements.
        </p>
      </div>
    </div>
  )
}
