'use client'

import { useEffect, useRef } from 'react'

/**
 * Fires one view count per page load.
 *
 * The ref guard matters: React runs effects twice in development's Strict Mode,
 * so without it every local visit would count as two.
 */
export function ViewTracker({ slug }: { slug: string }) {
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true

    // Fire and forget — a failed count must never surface to the buyer.
    void fetch(`/api/listings/${encodeURIComponent(slug)}/view`, {
      method: 'POST',
      keepalive: true,
    }).catch(() => {})
  }, [slug])

  return null
}
