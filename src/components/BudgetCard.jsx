import { useState } from 'react'
import { IconCurrencyDollar, IconPlus } from '@tabler/icons-react'

const ACCENT = '#534AB7'

const CURRENCIES = {
  USD: { symbol: '$',  label: 'USD $'  },
  GBP: { symbol: '£',  label: 'GBP £'  },
  EUR: { symbol: '€',  label: 'EUR €'  },
  AUD: { symbol: 'A$', label: 'AUD A$' },
}

export default function BudgetCard({ budget, setBudget }) {
  const [currency, setCurrency] = useState('USD')
  const [totalInput, setTotalInput] = useState('')
  const [showExpForm, setShowExpForm] = useState(false)
  const [expForm, setExpForm] = useState({ desc: '', amount: '' })

  const sym = CURRENCIES[currency].symbol

  function configure() {
    const val = parseFloat(totalInput)
    if (!val || val <= 0) return
    setBudget(b => ({ ...b, configured: true, total: val }))
    setTotalInput('')
  }

  function addExpense() {
    const amt = parseFloat(expForm.amount)
    if (!expForm.desc || !amt || amt <= 0) return
    setBudget(b => ({
      ...b,
      spent: b.spent + amt,
      expenses: [...b.expenses, { id: Date.now(), desc: expForm.desc, amount: amt }],
    }))
    setExpForm({ desc: '', amount: '' })
    setShowExpForm(false)
  }

  const pct = budget.total > 0 ? Math.min((budget.spent / budget.total) * 100, 100) : 0
  const barColor = pct > 80 ? 'var(--status-error)' : pct > 60 ? 'var(--status-warning)' : ACCENT

  const fa = e => { e.target.style.borderColor = ACCENT }
  const fb = e => { e.target.style.borderColor = '' }

  return (
    <div
      className="rounded-lg p-5"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderLeft: '3px solid #534AB7',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--brand-accent-glow)' }}
        >
          <IconCurrencyDollar size={15} style={{ color: ACCENT }} />
        </div>
        <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Budget Tracker</span>

        <select
          className="ml-auto text-xs rounded-lg px-2 py-1 outline-none cursor-pointer transition-colors"
          style={{
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
          }}
          value={currency}
          onChange={e => setCurrency(e.target.value)}
        >
          {Object.entries(CURRENCIES).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {!budget.configured ? (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Set a total budget to start tracking expenses.</p>
          <div className="flex gap-2">
            <div
              className="flex-1 flex items-center rounded-lg overflow-hidden transition-colors"
              style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)' }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = ACCENT)}
              onBlurCapture={e => (e.currentTarget.style.borderColor = '')}
            >
              <span className="px-2.5 text-sm select-none" style={{ color: 'var(--text-tertiary)' }}>{sym}</span>
              <input
                type="number"
                min="0"
                className="flex-1 text-sm py-2 pr-3 outline-none"
                style={{ backgroundColor: 'transparent', color: 'var(--text-primary)' }}
                placeholder="0.00"
                value={totalInput}
                onChange={e => setTotalInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && configure()}
              />
            </div>
            <button
              onClick={configure}
              className="px-3 py-2 rounded-full text-sm font-medium text-white hover:opacity-80 transition-opacity"
              style={{ backgroundColor: ACCENT }}
            >
              Set
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--text-tertiary)' }}>Spent</span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{sym}{budget.spent.toLocaleString()} / {sym}{budget.total.toLocaleString()}</span>
          </div>

          <div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: barColor }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span style={{ color: 'var(--text-tertiary)' }}>Remaining: {sym}{(budget.total - budget.spent).toLocaleString()}</span>
              <span style={{ color: barColor }}>{pct.toFixed(0)}% used</span>
            </div>
          </div>

          {budget.expenses.length > 0 && (
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {budget.expenses.map(e => (
                <div key={e.id} className="flex items-center justify-between text-xs py-1">
                  <span className="truncate" style={{ color: 'var(--text-secondary)' }}>{e.desc}</span>
                  <span className="font-medium flex-shrink-0 ml-2" style={{ color: 'var(--text-primary)' }}>{sym}{e.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {showExpForm ? (
            <div className="space-y-2 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <input
                className="w-full text-xs rounded-lg px-2.5 py-1.5 outline-none transition-colors"
                style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                placeholder="Expense description"
                value={expForm.desc}
                onChange={e => setExpForm(f => ({ ...f, desc: e.target.value }))}
                onFocus={fa} onBlur={fb}
              />
              <div className="flex gap-2">
                <div
                  className="flex-1 flex items-center rounded-lg overflow-hidden"
                  style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)' }}
                  onFocusCapture={e => (e.currentTarget.style.borderColor = ACCENT)}
                  onBlurCapture={e => (e.currentTarget.style.borderColor = '')}
                >
                  <span className="px-2 text-xs select-none" style={{ color: 'var(--text-tertiary)' }}>{sym}</span>
                  <input
                    type="number"
                    min="0"
                    className="flex-1 text-xs py-1.5 pr-2 outline-none"
                    style={{ backgroundColor: 'transparent', color: 'var(--text-primary)' }}
                    placeholder="0.00"
                    value={expForm.amount}
                    onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addExpense()}
                  />
                </div>
                <button
                  onClick={addExpense}
                  className="px-2.5 py-1.5 rounded-full text-xs font-medium text-white hover:opacity-80"
                  style={{ backgroundColor: ACCENT }}
                >
                  Add
                </button>
                <button
                  onClick={() => setShowExpForm(false)}
                  className="px-2 py-1.5 rounded-lg text-xs transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowExpForm(true)}
              className="flex items-center gap-1 text-xs hover:opacity-70 transition-opacity"
              style={{ color: ACCENT }}
            >
              <IconPlus size={13} /> Add expense
            </button>
          )}

          <p className="text-xs pt-1" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}>
            For detailed reporting, export to a spreadsheet.
          </p>
        </div>
      )}
    </div>
  )
}
