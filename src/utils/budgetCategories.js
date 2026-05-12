export const BUDGET_CATEGORIES = [
  { id: 'art',         label: 'Art & Design',          color: '#7c3aed' },
  { id: 'audio',       label: 'Audio & Music',          color: '#0891b2' },
  { id: 'programming', label: 'Programming',            color: '#534AB7' },
  { id: 'marketing',   label: 'Marketing',              color: '#db2777' },
  { id: 'equipment',   label: 'Equipment',              color: '#d97706' },
  { id: 'software',    label: 'Software & Tools',       color: '#059669' },
  { id: 'contractor',  label: 'Contractor / Freelance', color: '#dc2626' },
  { id: 'events',      label: 'Events',                 color: '#92400e' },
  { id: 'travel',      label: 'Travel',                 color: '#0369a1' },
  { id: 'legal',       label: 'Legal',                  color: '#374151' },
  { id: 'funding',     label: 'Funding',                color: '#16a34a' },
  { id: 'revenue',     label: 'Sales & Revenue',        color: '#15803d' },
  { id: 'other',       label: 'Other',                  color: '#6b7280' },
]

export const CURRENCIES = {
  USD: { symbol: '$',  label: 'USD $'  },
  GBP: { symbol: '£',  label: 'GBP £'  },
  EUR: { symbol: '€',  label: 'EUR €'  },
  AUD: { symbol: 'A$', label: 'AUD A$' },
}

export function getCategoryMeta(id) {
  return BUDGET_CATEGORIES.find(c => c.id === id) ?? BUDGET_CATEGORIES.find(c => c.id === 'other')
}

export function migrateBudget(raw) {
  if (!raw) return { currency: 'USD', total: 0, transactions: [] }
  if (Array.isArray(raw.transactions)) return raw
  const transactions = (raw.expenses ?? []).map(e => ({
    id: e.id ?? Date.now() + Math.random(),
    date: new Date().toISOString().slice(0, 10),
    description: e.desc ?? e.description ?? '',
    category: 'other',
    amount: e.amount,
    type: 'expense',
  }))
  return { currency: raw.currency ?? 'USD', total: raw.total ?? 0, transactions }
}
