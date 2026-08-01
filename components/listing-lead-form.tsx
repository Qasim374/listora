'use client'

import { useState } from 'react'

/**
 * Buyer enquiry form. Replaces the old "Show contact details" button.
 *
 * That button was backwards: it made the buyer do the work and gave the agent
 * nothing. A buyer who taps it, copies an email and never writes is a lead the
 * agent never knew existed. This captures the enquiry instead.
 */
export function ListingLeadForm({ slug, agentName }: { slug: string; agentName: string }) {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const data = new FormData(event.currentTarget)

    try {
      const response = await fetch(`/api/listings/${encodeURIComponent(slug)}/lead`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: String(data.get('name') ?? ''),
          email: String(data.get('email') ?? ''),
          phone: String(data.get('phone') ?? ''),
          message: String(data.get('message') ?? ''),
          website: String(data.get('website') ?? ''),
        }),
      })

      const result = (await response.json()) as { ok?: boolean; error?: string }

      if (!response.ok || !result.ok) {
        setError(result.error ?? 'Could not send your message. Please try again.')
        return
      }

      setSent(true)
    } catch {
      setError('Could not send your message. Please check your connection.')
    } finally {
      setPending(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <h2 className="font-display text-xl text-brand-900">Message sent</h2>
        <p className="mt-2 text-sm text-ink-soft">
          {agentName} has your details and will be in touch.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="text-left">
      <h2 className="font-display text-xl text-brand-900">Request a viewing</h2>
      <p className="mt-1.5 text-sm text-ink-soft">
        Send {agentName} a message and they will get back to you.
      </p>

      <div className="mt-5 space-y-3">
        <div>
          <label htmlFor="lead-name" className="label">
            Your name
          </label>
          <input id="lead-name" name="name" required autoComplete="name" className="input" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="lead-email" className="label">
              Email
            </label>
            <input
              id="lead-email"
              name="email"
              type="email"
              autoComplete="email"
              className="input"
            />
          </div>
          <div>
            <label htmlFor="lead-phone" className="label">
              Phone
            </label>
            <input id="lead-phone" name="phone" type="tel" autoComplete="tel" className="input" />
          </div>
        </div>
        <p className="text-xs text-ink-muted">Give an email or a phone number — either is fine.</p>

        <div>
          <label htmlFor="lead-message" className="label">
            Message
          </label>
          <textarea
            id="lead-message"
            name="message"
            required
            rows={4}
            placeholder="I would like to see this property. Are there viewings this weekend?"
            className="input"
          />
        </div>

        {/* Honeypot: hidden from people, irresistible to bots. Not type=hidden,
            because bots skip those — it has to look like a real field. */}
        <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="lead-website">Website</label>
          <input id="lead-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-accent bg-accent-soft/20 px-4 py-3 text-sm text-ink"
        >
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="btn-primary mt-5 w-full py-3">
        {pending ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}
