export default async function handler(req, res) {
  const { code } = req.query
  if (!code) {
    res.redirect('/?error=no_code')
    return
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const baseUrl = process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:5173'
  const redirectUri = `${baseUrl}/api/auth/callback/google`

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      res.redirect('/?error=token_exchange_failed')
      return
    }

    // Fetch user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const userInfo = await userRes.json()

    if (!userInfo.email) {
      res.redirect('/?error=no_email')
      return
    }

    const user = {
      name: userInfo.name || userInfo.email.split('@')[0],
      email: userInfo.email,
      picture: userInfo.picture || null,
      googleId: userInfo.id,
    }

    const encoded = Buffer.from(JSON.stringify(user)).toString('base64url')
    res.redirect(`${baseUrl}/auth/google/success?user=${encoded}`)
  } catch (err) {
    console.error('[google callback]', err)
    res.redirect('/?error=oauth_failed')
  }
}
