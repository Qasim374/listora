'use client'

import { useState } from 'react'

/**
 * Share row for buyers: native share sheet on mobile, copy-link everywhere else.
 * navigator.share only exists on mobile browsers and requires a user gesture,
 * so the button falls back to clipboard rather than disappearing.
 */
export function ListingShare({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)

  async function share() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // User dismissed the sheet, or it isn't usable here — fall through to copy
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Nothing useful to do; the URL is in the address bar
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={share} className="btn-secondary">
        {copied ? 'Link copied' : 'Share'}
      </button>
      <button type="button" onClick={() => window.print()} className="btn-secondary">
        Print
      </button>
    </div>
  )
}
