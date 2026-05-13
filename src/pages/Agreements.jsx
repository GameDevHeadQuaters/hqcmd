import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconInbox, IconFileText, IconFileOff,
  IconPlus, IconSearch, IconClock, IconCircleCheck, IconWritingSign,
} from '@tabler/icons-react'
import { AGREEMENT_TEMPLATES } from '../utils/agreementTemplates'
import AgreementBuilder from '../components/AgreementBuilder'
import AgreementViewer from '../components/AgreementViewer'
import ProfileDropdown from '../components/ProfileDropdown'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'

const CATEGORY_LABELS = {
  compensation: 'Compensation',
  legal: 'Legal',
  partnership: 'Partnership',
}

const CATEGORY_COLORS = {
  compensation: { bg: 'rgba(83,74,183,0.15)',   text: '#534AB7' },
  legal:        { bg: 'rgba(237,39,147,0.12)',  text: '#ed2793' },
  partnership:  { bg: 'rgba(128,93,168,0.15)',  text: '#805da8' },
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusBadge({ status }) {
  if (status === 'fully_signed') {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0"
        style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: 'var(--status-success)' }}>
        <IconCircleCheck size={11} />
        Fully Signed
      </div>
    )
  }
  if (status === 'pending_countersign' || status === 'signed') {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0"
        style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: 'var(--status-warning)' }}>
        <IconClock size={11} />
        Awaiting Countersign
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0"
      style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>
      Draft
    </div>
  )
}

export default function Agreements({
  agreements,
  setAgreements,
  currentUser,
  onSignOut,
  unreadInboxCount,
  onAddNotification,
  users,
  onAddNotificationForUser,
  onAddDirectMessageForUser,
}) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('library')
  const [search, setSearch] = useState('')
  const [builderTemplate, setBuilderTemplate] = useState(null)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [viewerAgreement, setViewerAgreement] = useState(null)
  const [profileDropOpen, setProfileDropOpen] = useState(false)

  const myAgreements = agreements ?? []
  const toSign = myAgreements.filter(a => a.isReceived && a.status === 'awaiting_my_signature')
  const myOwnAgreements = myAgreements.filter(a => !a.isReceived)

  const filteredTemplates = AGREEMENT_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  )

  const filteredAgreements = myOwnAgreements.filter(a =>
    a.templateName.toLowerCase().includes(search.toLowerCase()) ||
    (a.projectTitle ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function openBuilder(template) {
    setBuilderTemplate(template)
    setBuilderOpen(true)
  }

  function handleSave(agreement) {
    setAgreements(prev => [agreement, ...(prev ?? [])])
    onAddNotification?.({
      type: 'message',
      text: `Agreement signed: ${agreement.templateName}${agreement.projectTitle ? ` for ${agreement.projectTitle}` : ''}`,
      link: '/agreements',
    })
    setBuilderOpen(false)
    setTab('my-agreements')
  }

  const viewerTemplate = viewerAgreement
    ? AGREEMENT_TEMPLATES.find(t => t.id === viewerAgreement.templateId)
    : null

  const liveViewerAgreement = viewerAgreement
    ? (myAgreements.find(a => a.id === viewerAgreement.id) ?? viewerAgreement)
    : null

  const grouped = filteredTemplates.reduce((acc, t) => {
    acc[t.category] = acc[t.category] ?? []
    acc[t.category].push(t)
    return acc
  }, {})

  return (
    <div className="min-h-screen" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Hero banner */}
        <div className="hq-hero rounded-lg p-6 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'white' }}>Agreements</h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Templates to formalise collaborations, commissions, and partnerships
            </p>
          </div>
          <button
            onClick={() => { setBuilderTemplate(null); setBuilderOpen(true) }}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full transition-all"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.25)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.22)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)' }}
          >
            <IconPlus size={16} />
            New Agreement
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <IconSearch size={15} style={{ color: 'var(--text-tertiary)', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search templates or agreements…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-sm rounded-lg pl-9 pr-4 py-2.5 outline-none transition-colors"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => (e.target.style.borderColor = ACCENT)}
            onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
          />
        </div>

        {/* Agreements to Sign */}
        {toSign.length > 0 && (
          <div className="mb-6 rounded-lg p-5" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <div className="flex items-center gap-2 mb-3">
              <IconWritingSign size={15} style={{ color: 'var(--status-warning)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Agreements to Sign</h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white leading-none" style={{ backgroundColor: '#ed2793' }}>
                {toSign.length}
              </span>
            </div>
            <div className="space-y-2">
              {toSign.map(a => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                >
                  {!a.read && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#ed2793' }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{a.templateName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      From: {a.signerName ?? '—'}
                      {a.projectTitle ? ` · ${a.projectTitle}` : ''}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: 'var(--status-warning)' }}
                  >
                    Awaiting Your Signature
                  </span>
                  <button
                    onClick={() => navigate(`/sign/${a.shareToken}`)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full text-white transition-colors flex-shrink-0"
                    style={{ backgroundColor: ACCENT }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
                  >
                    Review &amp; Sign
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex mb-6 gap-0.5" style={{ borderBottom: '1px solid var(--border-default)' }}>
          {[
            { id: 'library', label: 'Template Library' },
            { id: 'my-agreements', label: `My Agreements${myOwnAgreements.length > 0 ? ` (${myOwnAgreements.length})` : ''}` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors relative"
              style={{ color: tab === t.id ? ACCENT : 'var(--text-tertiary)' }}
            >
              {t.label}
              {tab === t.id && (
                <span
                  className="hq-tab-indicator absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                  style={{ marginBottom: '-1px' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Template Library */}
        {tab === 'library' && (
          <div className="space-y-8">
            {Object.keys(grouped).length === 0 ? (
              <p className="text-sm text-center py-12" style={{ color: 'var(--text-tertiary)' }}>No templates match your search.</p>
            ) : Object.entries(grouped).map(([cat, templates]) => (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{CATEGORY_LABELS[cat] ?? cat}</h3>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={CATEGORY_COLORS[cat] ?? { backgroundColor: 'var(--brand-accent-glow)', color: ACCENT }}
                  >
                    {templates.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templates.map(t => (
                    <div
                      key={t.id}
                      className="hq-card rounded-lg p-5 transition-shadow"
                      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                        style={{ backgroundColor: (CATEGORY_COLORS[t.category] ?? { bg: 'var(--brand-accent-glow)' }).bg }}
                      >
                        <IconFileText size={18} style={{ color: (CATEGORY_COLORS[t.category] ?? { text: ACCENT }).text }} />
                      </div>
                      <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{t.name}</h4>
                      <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{t.description}</p>
                      <button
                        onClick={() => openBuilder(t)}
                        className="w-full text-xs font-semibold py-2 rounded-full text-white transition-colors"
                        style={{ backgroundColor: ACCENT }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
                      >
                        Use Template
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* My Agreements */}
        {tab === 'my-agreements' && (
          <>
            {filteredAgreements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <IconFileOff size={48} style={{ color: 'var(--brand-purple)' }} className="mb-4" />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  {myOwnAgreements.length === 0 ? 'No agreements yet' : 'No matches found'}
                </p>
                <p className="text-xs mb-5" style={{ color: 'var(--text-tertiary)' }}>
                  {myOwnAgreements.length === 0
                    ? 'Choose a template from the library to get started.'
                    : 'Try a different search term.'}
                </p>
                {myOwnAgreements.length === 0 && (
                  <button
                    onClick={() => setTab('library')}
                    className="text-sm font-semibold px-4 py-2 rounded-full text-white transition-colors"
                    style={{ backgroundColor: ACCENT }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
                  >
                    Browse Templates
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAgreements.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setViewerAgreement(a)}
                    className="w-full flex items-center gap-4 p-4 rounded-lg text-left transition-all"
                    style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--border-strong)'
                      e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border-default)'
                      e.currentTarget.style.backgroundColor = 'var(--bg-surface)'
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'var(--brand-accent-glow)' }}
                    >
                      <IconFileText size={20} style={{ color: ACCENT }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{a.templateName}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {a.projectTitle ? `${a.projectTitle} · ` : ''}{formatDate(a.signedAt)}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {builderOpen && (
        <AgreementBuilder
          initialTemplate={builderTemplate}
          projectId={null}
          projectTitle={null}
          currentUser={currentUser}
          onSave={handleSave}
          onClose={() => setBuilderOpen(false)}
        />
      )}

      {liveViewerAgreement && viewerTemplate && (
        <AgreementViewer
          agreement={liveViewerAgreement}
          template={viewerTemplate}
          onClose={() => setViewerAgreement(null)}
          users={users}
          setAgreements={setAgreements}
          currentUser={currentUser}
          onAddNotificationForUser={onAddNotificationForUser}
          onAddDirectMessageForUser={onAddDirectMessageForUser}
        />
      )}
    </div>
  )
}
