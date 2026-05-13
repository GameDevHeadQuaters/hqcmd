import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconPlus, IconX, IconSearch, IconDownload } from '@tabler/icons-react'
import { BUDGET_CATEGORIES, CURRENCIES, migrateBudget, getCategoryMeta } from '../utils/budgetCategories'

const ACCENT = '#534AB7'

export default function BudgetPage({ currentUser, projects, onUpdateProject, setActiveProjectId }) {
  const { projectId } = useParams()
  const navigate = useNavigate()

  const project = projects.find(p => String(p.id) === projectId)
  const budget = migrateBudget(project?.budget)
  const { currency = 'USD', total = 0, transactions = [] } = budget
  const sym = CURRENCIES[currency]?.symbol ?? '$'

  const [typeFilter, setTypeFilter] = useState('all')
  const [search,     setSearch]     = useState('')
  const [slideOpen,  setSlideOpen]  = useState(false)
  const [editTotal,  setEditTotal]  = useState(false)
  const [totalInput, setTotalInput] = useState(String(total || ''))
  const [form,       setForm]       = useState({
    type: 'expense',
    desc: '',
    amount: '',
    category: 'other',
    date: new Date().toISOString().slice(0, 10),
  })

  const totalIn  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalOut = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const net      = totalIn - totalOut
  const pct      = total > 0 ? Math.min((totalOut / total) * 100, 100) : 0
  const barColor = pct > 80 ? 'var(--status-error)' : pct > 60 ? 'var(--status-warning)' : ACCENT

  const withBalance = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date))
    let running = 0
    return sorted.map(t => {
      running += t.type === 'income' ? t.amount : -t.amount
      return { ...t, balance: running }
    }).reverse()
  }, [transactions])

  const filteredRows = useMemo(() => {
    return withBalance.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [withBalance, typeFilter, search])

  const categoryBreakdown = useMemo(() => {
    const map = {}
    for (const t of transactions.filter(t => t.type === 'expense')) {
      map[t.category] = (map[t.category] ?? 0) + t.amount
    }
    return Object.entries(map)
      .map(([id, amount]) => ({ ...getCategoryMeta(id), amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [transactions])
  const maxCatAmount = categoryBreakdown[0]?.amount ?? 1

  function updateBudget(newBudget) {
    if (!project) return
    onUpdateProject(project.id, { budget: newBudget })
  }

  function saveTotal() {
    const val = parseFloat(totalInput)
    if (!val || val <= 0) return
    updateBudget({ ...budget, total: val })
    setEditTotal(false)
  }

  function addTransaction() {
    const amt = parseFloat(form.amount)
    if (!form.desc.trim() || !amt || amt <= 0) return
    const tx = {
      id: Date.now(),
      date: form.date || new Date().toISOString().slice(0, 10),
      description: form.desc.trim(),
      category: form.category,
      amount: amt,
      type: form.type,
    }
    updateBudget({ ...budget, transactions: [...transactions, tx] })
    setForm({ type: 'expense', desc: '', amount: '', category: 'other', date: new Date().toISOString().slice(0, 10) })
    setSlideOpen(false)
  }

  function removeTransaction(id) {
    updateBudget({ ...budget, transactions: transactions.filter(t => t.id !== id) })
  }

  function goBack() {
    if (project) setActiveProjectId?.(project.id)
    navigate('/workstation')
  }

  function exportCSV() {
    const headers = ['Date', 'Description', 'Type', 'Category', 'Tag', 'Amount', 'Currency']
    const rows = transactions.map(t => [
      t.date,
      `"${(t.description ?? '').replace(/"/g, '""')}"`,
      t.type,
      t.category,
      t.customTag ?? '',
      t.amount,
      currency,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.title}-budget.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const fi = e => (e.target.style.borderColor = ACCENT)
  const fb = e => (e.target.style.borderColor = 'var(--border-default)')

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-base)' }}>
        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>Project not found.</p>
          <button
            onClick={() => navigate('/projects')}
            className="text-sm px-4 py-2 rounded-full text-white hover:opacity-80 transition-opacity"
            style={{ backgroundColor: ACCENT }}
          >
            Go to My Projects
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      {/* Page action bar */}
      <div className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{project.title}</span>
          <span className="text-xs ml-2" style={{ color: 'var(--text-tertiary)' }}>Budget</span>
        </div>
        <div className="flex items-center gap-2">
          {transactions.length > 0 && (
            <button
              onClick={exportCSV}
              title="Export CSV"
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-opacity hover:opacity-70"
              style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)' }}
            >
              <IconDownload size={14} /> Export
            </button>
          )}
          <button
            onClick={() => setSlideOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: ACCENT }}
          >
            <IconPlus size={15} /> Add Transaction
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        className="max-w-7xl mx-auto px-6 py-6"
        style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px', alignItems: 'start' }}
      >
        {/* Left: Ledger */}
        <div>
          <div className="flex items-center gap-3 mb-4 flex-wrap gap-y-2">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Transactions</h2>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}
            >
              {transactions.length}
            </span>
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {/* Type filter */}
              <div
                className="flex rounded-full overflow-hidden text-xs"
                style={{ border: '1px solid var(--border-default)' }}
              >
                {[['all', 'All'], ['income', 'Income'], ['expense', 'Expense']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setTypeFilter(val)}
                    className="px-3 py-1 font-medium transition-colors"
                    style={{
                      backgroundColor: typeFilter === val ? ACCENT : 'transparent',
                      color: typeFilter === val ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {/* Search */}
              <div
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)' }}
              >
                <IconSearch size={13} style={{ color: 'var(--text-tertiary)' }} />
                <input
                  className="text-xs outline-none w-32"
                  style={{ backgroundColor: 'transparent', color: 'var(--text-primary)' }}
                  placeholder="Search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div
              className="rounded-lg p-10 text-center"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
            >
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {transactions.length === 0 ? 'No transactions yet.' : 'No matching transactions.'}
              </p>
              {transactions.length === 0 && (
                <button
                  onClick={() => setSlideOpen(true)}
                  className="mt-3 text-xs px-4 py-2 rounded-full text-white hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: ACCENT }}
                >
                  Add First Transaction
                </button>
              )}
            </div>
          ) : (
            <div
              className="rounded-lg overflow-hidden"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
            >
              {/* Table header */}
              <div
                className="grid text-xs font-medium px-4 py-2.5"
                style={{
                  gridTemplateColumns: '90px 1fr 130px 100px 100px 32px',
                  color: 'var(--text-tertiary)',
                  borderBottom: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-elevated)',
                }}
              >
                <span>Date</span>
                <span>Description</span>
                <span>Category</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Balance</span>
                <span />
              </div>

              {/* Rows */}
              {filteredRows.map((tx, i) => {
                const cat = getCategoryMeta(tx.category)
                const isIncome = tx.type === 'income'
                return (
                  <div
                    key={tx.id}
                    className="grid items-center px-4 py-3 text-xs transition-colors"
                    style={{
                      gridTemplateColumns: '90px 1fr 130px 100px 100px 32px',
                      borderBottom: i < filteredRows.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                  >
                    <span style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(tx.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="truncate pr-3" style={{ color: 'var(--text-primary)' }}>{tx.description}</span>
                    <span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ backgroundColor: cat.color + '22', color: cat.color }}
                      >
                        {cat.label}
                      </span>
                    </span>
                    <span
                      className="text-right font-medium"
                      style={{ color: isIncome ? 'var(--status-success)' : 'var(--status-error)' }}
                    >
                      {isIncome ? '+' : '−'}{sym}{tx.amount.toLocaleString()}
                    </span>
                    <span
                      className="text-right"
                      style={{ color: tx.balance >= 0 ? 'var(--text-primary)' : 'var(--status-error)' }}
                    >
                      {tx.balance < 0 ? '-' : ''}{sym}{Math.abs(tx.balance).toLocaleString()}
                    </span>
                    <button
                      onClick={() => removeTransaction(tx.id)}
                      className="flex items-center justify-center w-7 h-7 rounded-lg ml-auto transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = 'var(--status-error)' }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--text-tertiary)' }}
                    >
                      <IconX size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Summary + Category Breakdown */}
        <div className="flex flex-col gap-4">
          {/* Summary */}
          <div
            className="rounded-lg p-5"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
          >
            <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Summary</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Total Income',   value: totalIn,  color: 'var(--status-success)' },
                { label: 'Total Expenses', value: totalOut, color: 'var(--status-error)' },
                { label: 'Net Balance',    value: net,      color: net >= 0 ? 'var(--status-success)' : 'var(--status-error)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span className="text-sm font-semibold" style={{ color }}>
                    {value < 0 ? '-' : ''}{sym}{Math.abs(value).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Budget total */}
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              {editTotal ? (
                <div className="flex gap-2">
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
                    onClick={() => setEditTotal(false)}
                    className="px-2 rounded-lg text-xs transition-colors"
                    style={{ color: 'var(--text-tertiary)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Budget Total</span>
                  <button
                    onClick={() => { setTotalInput(String(total || '')); setEditTotal(true) }}
                    className="text-xs font-medium transition-opacity hover:opacity-70"
                    style={{ color: total > 0 ? 'var(--text-primary)' : ACCENT }}
                  >
                    {total > 0 ? `${sym}${total.toLocaleString()}` : '+ Set'}
                  </button>
                </div>
              )}
            </div>

            {/* Progress */}
            {total > 0 && (
              <div className="mt-2">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
                <p className="text-[10px] mt-1 text-right" style={{ color: barColor }}>
                  {pct.toFixed(0)}% of budget used
                </p>
              </div>
            )}
          </div>

          {/* Category breakdown */}
          {categoryBreakdown.length > 0 && (
            <div
              className="rounded-lg p-5"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
            >
              <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Expenses by Category</h3>
              <div className="space-y-3">
                {categoryBreakdown.map(cat => (
                  <div key={cat.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--text-secondary)' }}>{cat.label}</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {sym}{cat.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(cat.amount / maxCatAmount) * 100}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Transaction Slide-over */}
      {slideOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSlideOpen(false)} />
          <div
            className="fixed right-0 top-0 h-full z-50 w-80 flex flex-col"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border-strong)',
              boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Add Transaction</h2>
              <button
                onClick={() => setSlideOpen(false)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                <IconX size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Type</label>
                <div className="flex rounded-full overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                  {['expense', 'income'].map(t => (
                    <button
                      key={t}
                      onClick={() => setForm(f => ({ ...f, type: t }))}
                      className="flex-1 py-2 text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: form.type === t ? (t === 'income' ? '#16a34a' : '#dc2626') : 'transparent',
                        color: form.type === t ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {t === 'expense' ? '− Expense' : '+ Income'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Description</label>
                <input
                  className="w-full text-sm rounded-lg px-3 py-2.5 outline-none"
                  style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                  placeholder="What is this transaction for?"
                  value={form.desc}
                  onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
                  onFocus={fi} onBlur={fb}
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Amount</label>
                <div
                  className="flex items-center rounded-lg overflow-hidden"
                  style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)' }}
                  onFocusCapture={e => (e.currentTarget.style.borderColor = ACCENT)}
                  onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
                >
                  <span className="px-3 text-sm select-none" style={{ color: 'var(--text-tertiary)' }}>{sym}</span>
                  <input
                    type="number" min="0"
                    className="flex-1 text-sm py-2.5 pr-3 outline-none"
                    style={{ backgroundColor: 'transparent', color: 'var(--text-primary)' }}
                    placeholder="0.00"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Category</label>
                <select
                  className="w-full text-sm rounded-lg px-3 py-2.5 outline-none"
                  style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  onFocus={fi} onBlur={fb}
                >
                  {BUDGET_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Date</label>
                <input
                  type="date"
                  className="w-full text-sm rounded-lg px-3 py-2.5 outline-none"
                  style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  onFocus={fi} onBlur={fb}
                />
              </div>
            </div>

            <div className="px-5 py-4 flex gap-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={addTransaction}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-80"
                style={{ backgroundColor: ACCENT }}
              >
                Add Transaction
              </button>
              <button
                onClick={() => setSlideOpen(false)}
                className="px-4 py-2.5 rounded-full text-sm transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
