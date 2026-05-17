export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const payload = req.body

  // Only process push events to main branch
  if (payload.ref !== 'refs/heads/main') return res.status(200).json({ skipped: true })

  const commits = payload.commits || []
  const entries = []

  commits.forEach(commit => {
    const message = commit.message

    // Skip merge commits and minor changes
    if (message.startsWith('Merge') || message.startsWith('Fix typo')) return

    let category = 'improvement'

    if (message.toLowerCase().includes('add') || message.toLowerCase().includes('build') || message.toLowerCase().includes('create')) {
      category = 'feature'
    }
    if (message.toLowerCase().includes('fix')) {
      category = 'fix'
    }

    entries.push({
      id: commit.id.slice(0, 8),
      title: formatCommitMessage(message),
      description: `Shipped in commit ${commit.id.slice(0, 7)}. ${commit.message}`,
      status: 'shipped',
      category,
      date: new Date(commit.timestamp).toISOString().split('T')[0],
      upvotes: 0,
      auto_generated: true,
    })
  })

  if (entries.length === 0) return res.status(200).json({ added: 0 })

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { error } = await supabase.from('roadmap').insert(entries)
  if (error) console.error('[Roadmap] Insert error:', error)

  return res.status(200).json({ added: entries.length })
}

function formatCommitMessage(message) {
  return message
    .replace(/^(Add|Fix|Update|Build|Create|Remove|Improve|Migrate)\s+/i, match => {
      return match.charAt(0).toUpperCase() + match.slice(1)
    })
    .replace(/in HQCMD$/i, '')
    .replace(/- HQCMD$/i, '')
    .trim()
}
