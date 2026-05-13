const BRAND_COLOR = '#534AB7'
const PINK = '#ed2793'

function emailWrapper(content) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0f0f13;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f13;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">HQ COMMAND</span>
        </td></tr>
        <tr><td style="background:#1a1a24;border-radius:16px;padding:32px;border:1px solid #2a2a38;">
          ${content}
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="font-size:11px;color:#555;margin:0;">© HQ COMMAND · <a href="https://hqcmd.app" style="color:#555;text-decoration:none;">hqcmd.app</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function betaApprovedEmail(name, inviteCode) {
  const subject = `You're in — your HQ COMMAND beta invite`
  const html = emailWrapper(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">You're in, ${name}! 🎉</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#aaa;line-height:1.6;">Your beta access request has been approved. Use the invite code below to create your account.</p>
    <div style="background:#0f0f13;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;border:1px solid #2a2a38;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:1px;">Your Invite Code</p>
      <p style="margin:0;font-size:28px;font-weight:700;letter-spacing:6px;color:#ffffff;font-family:ui-monospace,monospace;">${inviteCode}</p>
    </div>
    <a href="https://hqcmd.app/signup" style="display:block;text-align:center;background:linear-gradient(90deg,${BRAND_COLOR},${PINK});color:#fff;font-weight:600;font-size:14px;padding:14px 24px;border-radius:100px;text-decoration:none;margin-bottom:24px;">Create Your Account</a>
    <p style="margin:0;font-size:12px;color:#555;text-align:center;">This invite code can only be used once. If you didn't request beta access, you can ignore this email.</p>
  `)
  return { subject, html }
}

export function agreementReceivedEmail(recipientName, senderName, projectTitle, signLink) {
  const subject = `${senderName} sent you an agreement to sign`
  const html = emailWrapper(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">Agreement to sign</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#aaa;line-height:1.6;">Hi ${recipientName}, <strong style="color:#fff;">${senderName}</strong> has sent you an agreement to review and sign${projectTitle ? ` for the project <strong style="color:#fff;">${projectTitle}</strong>` : ''}.</p>
    <a href="${signLink}" style="display:block;text-align:center;background:linear-gradient(90deg,${BRAND_COLOR},${PINK});color:#fff;font-weight:600;font-size:14px;padding:14px 24px;border-radius:100px;text-decoration:none;margin-bottom:24px;">Review &amp; Sign Agreement</a>
    <p style="margin:0 0 16px;font-size:12px;color:#555;text-align:center;">Or copy this link into your browser:</p>
    <p style="margin:0;font-size:11px;color:#444;text-align:center;word-break:break-all;">${signLink}</p>
  `)
  return { subject, html }
}

export function accessGrantedEmail(recipientName, projectTitle, ownerName) {
  const subject = `You've been granted access to ${projectTitle}`
  const html = emailWrapper(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">Access granted! 🚀</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#aaa;line-height:1.6;">Hi ${recipientName}, <strong style="color:#fff;">${ownerName}</strong> has granted you access to the project <strong style="color:#fff;">${projectTitle}</strong> on HQ COMMAND.</p>
    <a href="https://hqcmd.app/projects" style="display:block;text-align:center;background:linear-gradient(90deg,${BRAND_COLOR},${PINK});color:#fff;font-weight:600;font-size:14px;padding:14px 24px;border-radius:100px;text-decoration:none;margin-bottom:24px;">View My Projects</a>
    <p style="margin:0;font-size:12px;color:#555;text-align:center;">The project will appear in your "Shared With Me" section under My Projects.</p>
  `)
  return { subject, html }
}

export async function sendEmail({ to, subject, html }) {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html }),
    })
    const data = await res.json()
    console.log('Email API response:', data)
    if (!res.ok) {
      console.error('Email failed:', data.error, data.details)
      return false
    }
    return true
  } catch (err) {
    console.warn('[sendEmail] network error:', err)
    return false
  }
}
