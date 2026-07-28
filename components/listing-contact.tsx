'use client'

import { useState } from 'react'

type Contact = {
  name: string
  email: string
  phone: string | null
}

/**
 * "Contact agent" — reveals details on click, fetched from
 * /api/listings/[slug]/contact so the email never sits in the page HTML where
 * crawlers would scrape it.
 */
export function ListingContact({ slug }: { slug: string }) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reveal() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/listings/${encodeURIComponent(slug)}/contact`)

      if (!response.ok) {
        throw new Error('Could not load contact details')
      }

      setContact((await response.json()) as Contact)
    } catch {
      setError('Could not load contact details. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (contact) {
    return (
      <div>
        <p className="text-sm text-ink-muted">Listed by</p>
        <p className="mt-1 font-display text-xl text-brand-900">{contact.name}</p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <a href={`mailto:${contact.email}`} className="btn-primary">
            {contact.email}
          </a>
          {contact.phone ? (
            <a href={`tel:${contact.phone.replace(/\s+/g, '')}`} className="btn-secondary">
              {contact.phone}
            </a>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="font-display text-xl text-brand-900">Interested in a viewing?</h2>
      <p className="mt-2 text-sm text-ink-soft">Get in touch with the agent to arrange a time.</p>

      <button type="button" onClick={reveal} disabled={loading} className="btn-primary mt-5">
        {loading ? 'Loading…' : 'Show contact details'}
      </button>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-accent">
          {error}
        </p>
      ) : null}
    </div>
  )
}
