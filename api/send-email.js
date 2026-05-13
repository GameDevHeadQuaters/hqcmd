export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { to, subject, html } = req.body ?? {}
  if (!to || !subject || !html) {
    res.status(400).json({ error: 'Missing required fields: to, subject, html' })
    return
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HQ COMMAND <hello@gamedevlocal.com>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('[send-email] Resend error:', data)
      res.status(response.status).json({ error: data.message || 'Failed to send email' })
      return
    }

    res.status(200).json({ id: data.id })
  } catch (err) {
    console.error('[send-email]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
