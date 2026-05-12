import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconCurrencyDollar, IconPlus, IconChevronRight } from '@tabler/icons-react'
import { BUDGET_CATEGORIES, CURRENCIES, migrateBudget } from '../utils/budgetCategories'

const ACCENT = '#534AB7'

export default function BudgetCard({ budget: rawBudget, onUpdateBudget, projectId }) {
  const navigate = useNavigate()
  const budget = migrateBudget(rawBudget)
  const { currency = 'USD', total = 0, transactions = [] } = budget
  const sym = CURRENCIES[currency]?.symbol ?? '$'

  const [showAdd,      setShowAdd]      = useState(false)
  const [showSetTotal, setShowSetTotal] = useState(false)
  const [addType,      setAddType]      = useState('expense')
  const [addForm,      setAddForm]      = useState({ desc: '', amount: '', category: 'other' })
  const [totalInput,   setTotalInput]   = useState('')

  const totalIn  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalOut = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const net      = totalIn - totalOut
  const pct      = total > 0 ? Math.min((totalOut / total) * 100, 100) : 0
  const barColor = pct > 80 ? 'var(--status-error)' : pct > 60 ? 'var(--status-warning)' : ACCENT

  function saveTotal() {
    const val = parseFloat(totalInput)
    if (!val || val <= 0) return
    onUpdateBudget?.({ ...budget, total: val })
    setTotalInput('')
    setShowSetTotal(false)
  }

  function addTransaction() {
    const amt = parseFloat(addForm.amount)
    if (!addForm.desc.trim() || !amt || amt <= 0) return
    const tx = {
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      description: addForm.desc.trim(),
      category: addForm.category,
      amount: amt,
      type: addType,
    }
    onUpdateBudget?.({ ...budget, transactions: [...transactions, tx] })
    setAddForm({ desc: '', amount: '', category: 'other' })
    setShowAdd(false)
  }

  const fi = e => (e.target.style.borderColor = ACCENT)
  const fb = e => (e.target.style.borderColor = 'var(--border-default)')

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
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--brand-accent-glow)' }}
        >
          <IconCurrencyDollar size={15} style={{ color: ACCENT }} />
        </div>
        <span className="font-medium text-sm flex-1" style={{ color: 'var(--text-primary)' }}>Budget</span>
        <select
          className="text-xs rounded-lg px-2 py-1 outline-none cursor-pointer"
          style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          value={currency}
          onChange={e => onUpdateBudget?.({ ...budget, currency: e.target.value })}
        >
          {Object.entries(CURRENCIES).map(([k, { label }]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'In',  value: totalIn,  color: 'var(--status-success)' },
          { label: 'Out', value: totalOut, color: 'var(--status-error)' },
          { label: 'Net', value: net,      color: net >= 0 ? 'var(--status-success)' : 'var(--status-error)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg p-2 text-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
            <p className="text-xs font-semibold" style={{ color }}>
              {value < 0 ? '-' : ''}{sym}{Math.abs(value).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-3">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: barColor }}
            />
          </div>
          <div className="flex justify-between text-[10px] mt-1">
            <span style={{ color: 'var(--text-tertiary)' }}>
              {sym}{Math.max(0, total - totalOut).toLocaleString()} left
            </span>
            <span style={{ color: barColor }}>{pct.toFixed(0)}% of {sym}{total.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Set budget total */}
      {total === 0 && (
        showSetTotal ? (
          <div className="flex gap-2 mb-3">
            <div
              className="flex-1 flex items-center rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)' }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = ACCENT)}
              onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
            >
              <span className="px-2 text-xs select-none" style={{ color: 'var(--text-tertiary)' }}>{sym}</span>
              <input
                type="number" min="0" autoFocus
                className="flex-1 text-xs py-1.5 pr-2 outline-none"
                style={{ backgroundColor: 'transparent', color: 'var(--text-primary)' }}
                placeholder="Budget total"
                value={totalInput}
                onChange={e => setTotalInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveTotal()}
              />
            </div>
            <button
              onClick={saveTotal}
              className="px-2.5 rounded-full text-xs font-medium text-white hover:opacity-80 transition-opacity"
              style={{ backgroundColor: ACCENT }}
            >
              Set
            </button>
            <button
              onClick={() => setShowSetTotal(false)}
              className="px-2 rounded-lg text-xs transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSetTotal(true)}
            className="text-xs mb-3 block transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-tertiary)' }}
          >
            + Set budget total
          </button>
        )
      )}

      {/* Separator */}
      <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', marginBottom: '10px' }} />

      {/* Add form */}
      {showAdd ? (
        <div className="space-y-2">
          <div
            className="flex rounded-full overflow-hidden text-xs"
            style={{ border: '1px solid var(--border-default)' }}
          >
            {['expense', 'income'].map(t => (
              <button
                key={t}
                onClick={() => setAddType(t)}
                className="flex-1 py-1 font-medium transition-colors"
                style={{
                  backgroundColor: addType === t ? (t === 'income' ? '#16a34a' : '#dc2626') : 'transparent',
                  color: addType === t ? 'white' : 'var(--text-secondary)',
                }}
              >
                {t === 'expense' ? '− Expense' : '+ Income'}
              </button>
            ))}
          </div>
          <input
            className="w-full text-xs rounded-lg px-2.5 py-1.5 outline-none"
            style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
            placeholder="Description"
            value={addForm.desc}
            onChange={e => setAddForm(f => ({ ...f, desc: e.target.value }))}
            onFocus={fi} onBlur={fb}
          />
          <div className="flex gap-1.5">
            <div
              className="flex items-center rounded-lg overflow-hidden flex-1"
              style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)' }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = ACCENT)}
              onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
            >
              <span className="px-2 text-xs select-none" style={{ color: 'var(--text-tertiary)' }}>{sym}</span>
              <input
                type="number" min="0"
                className="flex-1 text-xs py-1.5 pr-2 outline-none"
                style={{ backgroundColor: 'transparent', color: 'var(--text-primary)' }}
                placeholder="0.00"
                value={addForm.amount}
                onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addTransaction()}
              />
            </div>
            <button
              onClick={addTransaction}
              className="px-2.5 rounded-full text-xs font-medium text-white hover:opacity-80 transition-opacity"
              style={{ backgroundColor: ACCENT }}
            >
              Add
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-2 rounded-lg text-xs transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
            >
              ✕
            </button>
          </div>
          <select
            className="w-full text-xs rounded-lg px-2.5 py-1.5 outline-none"
            style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            value={addForm.category}
            onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
          >
            {BUDGET_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
          style={{ color: ACCENT }}
        >
          <IconPlus size={13} /> Add transaction
        </button>
      )}

      {/* View full report */}
      {projectId && (
        <button
          onClick={() => navigate(`/budget/${projectId}`)}
          className="flex items-center justify-between w-full mt-3 pt-3 text-xs transition-opacity hover:opacity-70"
          style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}
        >
          <span>View Full Report</span>
          <IconChevronRight size={13} />
        </button>
      )}
    </div>
  )
}
