export type EmailMessage = {
  to: string
  subject: string
  /** Plain text is required; HTML is optional and generated from it if absent. */
  text: string
  html?: string
}

/**
 * Sends transactional email through Resend's REST API.
 *
 * Called with plain `fetch` rather than the `resend` package — the API is a
 * single POST, so the SDK would add a dependency for no benefit.
 *
 * When RESEND_API_KEY is absent the message is logged to the server console
 * instead of failing. That keeps the whole password-reset flow testable locally
 * with no account: the reset link appears in the terminal. It also means a
 * missing key in production degrades to "email silently not sent", so
 * `emailConfigured()` exists for callers that need to warn the user.
 */
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

export async function sendEmail(message: EmailMessage): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? 'Listora <onboarding@resend.dev>'

  if (!apiKey) {
    /* eslint-disable no-console */
    console.log('\n--- EMAIL (not sent: RESEND_API_KEY is not set) ---')
    console.log(`To:      ${message.to}`)
    console.log(`Subject: ${message.subject}`)
    console.log(message.text)
    console.log('--- end email ---\n')
    /* eslint-enable no-console */
    return { ok: true }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html ?? textToHtml(message.text),
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error('Resend rejected the email', response.status, detail.slice(0, 300))
      return { ok: false, error: `Email provider returned ${response.status}` }
    }

    return { ok: true }
  } catch (error) {
    console.error('Failed to send email', error)
    return { ok: false, error: 'Could not reach the email provider' }
  }
}

/** Minimal, escaped HTML fallback so links stay clickable in every client. */
function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  const linked = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#155448">$1</a>',
  )

  return `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#12211F">${linked
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('')}</div>`
}
