import { useState } from 'react'
import { AGREEMENT_TEMPLATES } from '../utils/agreementTemplates'
import { AGREEMENT_DISCLAIMER } from '../utils/agreementDisclaimer'
import {
  IconX, IconChevronRight, IconChevronLeft, IconFileText,
  IconAlertTriangle, IconCheck, IconWritingSign,
} from '@tabler/icons-react'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'

const CATEGORY_LABELS = {
  compensation: 'Compensation',
  legal: 'Legal',
  partnership: 'Partnership',
}

function fillBody(body, fields) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => fields[key] || `[${key}]`)
}

function TemplateCard({ template, onSelect }) {
  return (
    <button
      onClick={() => onSelect(template)}
      className="w-full text-left p-4 rounded-lg transition-all group"
      style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)' }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = ACCENT
        e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-default)'
        e.currentTarget.style.backgroundColor = 'var(--bg-surface)'
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{template.name}</p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{template.description}</p>
        </div>
        <IconChevronRight size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 1 }} />
      </div>
      <span
        className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: 'var(--brand-accent-glow)', color: ACCENT }}
      >
        {CATEGORY_LABELS[template.category] ?? template.category}
      </span>
    </button>
  )
}

export default function AgreementBuilder({
  initialTemplate,
  projectId,
  projectTitle,
  prefill,
  currentUser,
  onSave,
  onClose,
}) {
  const [template, setTemplate] = useState(initialTemplate ?? null)
  const startStep = initialTemplate ? 1 : 0
  const [step, setStep] = useState(startStep)

  const prefillFields = prefill ? {
    collaboratorName: prefill.recipientName || '',
    contractorName:   prefill.recipientName || '',
    artistName:       prefill.recipientName || '',
  } : {}

  const [disclaimerChecked, setDisclaimerChecked] = useState(false)
  const [fields, setFields] = useState(prefill && initialTemplate ? prefillFields : {})
  const [signerName,  setSignerName]  = useState(currentUser?.name  ?? '')
  const [signerEmail, setSignerEmail] = useState(currentUser?.email ?? '')
  const [signChecked, setSignChecked] = useState(false)
  const [signing, setSigning] = useState(false)

  const grouped = AGREEMENT_TEMPLATES.reduce((acc, t) => {
    acc[t.category] = acc[t.category] ?? []
    acc[t.category].push(t)
    return acc
  }, {})

  function setField(id, value) {
    setFields(prev => ({ ...prev, [id]: value }))
  }

  function selectTemplate(t) {
    setTemplate(t)
    setFields(prefill ? prefillFields : {})
    setStep(1)
  }

  function handleSign() {
    if (!signerName.trim() || !signerEmail.trim() || !signChecked) return
    setSigning(true)
    const agreement = {
      id: Date.now(),
      templateId: template.id,
      templateName: template.name,
      projectId: projectId ?? null,
      projectTitle: projectTitle ?? null,
      status: 'pending_countersign',
      fields,
      signerName: signerName.trim(),
      signerEmail: signerEmail.trim(),
      signedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      counterpartyName: '',
      counterpartyEmail: '',
      counterpartySignedAt: null,
      shareToken: null,
      sentToInbox: false,
    }
    onSave(agreement)
    onClose()
  }

  const previewText = template ? fillBody(template.body, fields) : ''
  const totalSteps = initialTemplate ? 3 : 4

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
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {step === 0 ? 'New Agreement' : `Step ${step} of ${totalSteps}`}
            </p>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {step === 0 && 'Choose a Template'}
              {step === 1 && 'Important Disclaimer'}
              {step === 2 && (template?.name ?? 'Fill in Details')}
              {step === 3 && 'Sign Agreement'}
            </h2>
          </div>
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

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Step 0: Template select */}
          {step === 0 && (
            <div className="space-y-6">
              {Object.entries(grouped).map(([cat, templates]) => (
                <div key={cat}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    {CATEGORY_LABELS[cat] ?? cat}
                  </p>
                  <div className="space-y-2">
                    {templates.map(t => (
                      <TemplateCard key={t.id} template={t} onSelect={selectTemplate} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 1: Disclaimer */}
          {step === 1 && (
            <div>
              <div
                className="rounded-lg p-5 mb-6 flex gap-3"
                style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}
              >
                <IconAlertTriangle size={20} style={{ color: 'var(--status-warning)', flexShrink: 0, marginTop: 1 }} />
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{AGREEMENT_DISCLAIMER}</p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div
                  onClick={() => setDisclaimerChecked(v => !v)}
                  className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
                  style={{
                    borderColor: disclaimerChecked ? ACCENT : 'var(--border-strong)',
                    backgroundColor: disclaimerChecked ? ACCENT : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {disclaimerChecked && <IconCheck size={12} color="white" />}
                </div>
                <span className="text-sm leading-relaxed select-none" style={{ color: 'var(--text-secondary)' }}>
                  I have read and understood this disclaimer and accept that HQCMD bears no
                  responsibility for agreements made using these templates.
                </span>
              </label>
            </div>
          )}

          {/* Step 2: Fields + live preview */}
          {step === 2 && template && (
            <div>
              {prefill && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(83,74,183,0.1)', border: '1px solid rgba(83,74,183,0.35)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '16px' }}>
                  📄 Sending agreement to <strong style={{ color: 'var(--text-primary)' }}>{prefill.recipientName}</strong> for <strong style={{ color: 'var(--text-primary)' }}>{prefill.role}</strong> on <strong style={{ color: 'var(--text-primary)' }}>{prefill.projectTitle}</strong>
                </div>
              )}
              <div className="space-y-4 mb-8">
                {template.fields.map(f => (
                  <div key={f.id}>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      {f.label}
                      {f.required && <span style={{ color: '#ed2793' }}> *</span>}
                    </label>
                    {f.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none transition-colors"
                        style={inputStyle}
                        placeholder={f.placeholder}
                        value={fields[f.id] ?? ''}
                        onChange={e => setField(f.id, e.target.value)}
                        onFocus={e => (e.target.style.borderColor = ACCENT)}
                        onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
                      />
                    ) : (
                      <input
                        type={f.type}
                        className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors"
                        style={inputStyle}
                        placeholder={f.placeholder}
                        value={fields[f.id] ?? ''}
                        onChange={e => setField(f.id, e.target.value)}
                        onFocus={e => (e.target.style.borderColor = ACCENT)}
                        onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Live preview */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                  <IconFileText size={13} />
                  Live Preview
                </p>
                <div className="rounded-lg p-5" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                  <pre className="text-xs whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', color: 'var(--text-secondary)' }}>
                    {previewText}
                  </pre>
                </div>
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
                  <input
                    type="text"
                    className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors"
                    style={inputStyle}
                    placeholder="Enter your full legal name"
                    value={signerName}
                    onChange={e => setSignerName(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = ACCENT)}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Your Email Address <span style={{ color: '#ed2793' }}>*</span>
                  </label>
                  <input
                    type="email"
                    className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors"
                    style={inputStyle}
                    placeholder="Enter your email address"
                    value={signerEmail}
                    onChange={e => setSignerEmail(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = ACCENT)}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer mb-6">
                <div
                  onClick={() => setSignChecked(v => !v)}
                  className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
                  style={{
                    borderColor: signChecked ? ACCENT : 'var(--border-strong)',
                    backgroundColor: signChecked ? ACCENT : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {signChecked && <IconCheck size={12} color="white" />}
                </div>
                <span className="text-sm leading-relaxed select-none" style={{ color: 'var(--text-secondary)' }}>
                  By signing, I confirm that I have read and agree to all terms in this agreement,
                  and I accept the HQCMD disclaimer. I understand this is not a legally verified document.
                </span>
              </label>

              {/* Preview summary */}
              <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Agreement Summary</p>
                <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>{template?.name}</p>
                {projectTitle && (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Project: {projectTitle}</p>
                )}
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Signing as: {signerName || '—'} ({signerEmail || '—'})
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between gap-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setStep(s => Math.max(startStep, s - 1))}
            className="flex items-center gap-1.5 text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)', visibility: step <= startStep ? 'hidden' : 'visible' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            <IconChevronLeft size={16} />
            Back
          </button>

          {step === 0 && (
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Select a template to continue</span>
          )}

          {step === 1 && (
            <button
              onClick={() => setStep(2)}
              disabled={!disclaimerChecked}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-white transition-all"
              style={{
                backgroundColor: disclaimerChecked ? ACCENT : 'var(--bg-elevated)',
                color: disclaimerChecked ? 'white' : 'var(--text-tertiary)',
                cursor: disclaimerChecked ? 'pointer' : 'not-allowed',
              }}
              onMouseEnter={e => { if (disclaimerChecked) e.currentTarget.style.backgroundColor = ACCENT_DARK }}
              onMouseLeave={e => { if (disclaimerChecked) e.currentTarget.style.backgroundColor = ACCENT }}
            >
              Continue
              <IconChevronRight size={16} />
            </button>
          )}

          {step === 2 && (
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-white transition-all"
              style={{ backgroundColor: ACCENT }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
            >
              Next: Sign
              <IconChevronRight size={16} />
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleSign}
              disabled={!signerName.trim() || !signerEmail.trim() || !signChecked || signing}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-white transition-all"
              style={{
                backgroundColor: (!signerName.trim() || !signerEmail.trim() || !signChecked || signing) ? 'var(--bg-elevated)' : ACCENT,
                color: (!signerName.trim() || !signerEmail.trim() || !signChecked || signing) ? 'var(--text-tertiary)' : 'white',
                cursor: (!signerName.trim() || !signerEmail.trim() || !signChecked || signing) ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (signerName.trim() && signerEmail.trim() && signChecked && !signing) e.currentTarget.style.backgroundColor = ACCENT_DARK }}
              onMouseLeave={e => { if (signerName.trim() && signerEmail.trim() && signChecked && !signing) e.currentTarget.style.backgroundColor = ACCENT }}
            >
              <IconWritingSign size={15} />
              Sign Agreement
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
