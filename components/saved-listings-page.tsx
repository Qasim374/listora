'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { formatArea, formatPrice } from '@/lib/format'
import { saleStatus, saleStatusClasses } from '@/lib/sale-status'
import { readSaved, removeSaved, SAVED_CHANGED_EVENT } from '@/lib/saved-listings'
import { cn } from '@/lib/utils'

type Summary = {
  slug: string
  address: string
  headline: string | null
  price: number | null
  beds: number | null
  baths: string | null
  sqft: number | null
  market: string
  saleStatus: string
  coverUrl: string | null
}

export function SavedListingsPage() {
  const [items, setItems] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)
  /** Slugs saved locally that no longer resolve — unpublished or deleted. */
  const [missing, setMissing] = useState(0)

  const load = useCallback(async () => {
    const slugs = readSaved()

    if (slugs.length === 0) {
      setItems([])
      setMissing(0)
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/listings/summaries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slugs }),
      })

      const data = (await response.json()) as { listings?: Summary[] }
      const found = data.listings ?? []

      // Preserve the saved order (newest first) rather than the DB's order
      const bySlug = new Map(found.map((item) => [item.slug, item]))
      const ordered = slugs
        .map((slug) => bySlug.get(slug))
        .filter((item): item is Summary => item !== undefined)

      setItems(ordered)
      setMissing(slugs.length - ordered.length)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()

    window.addEventListener(SAVED_CHANGED_EVENT, () => void load())
    return () => window.removeEventListener(SAVED_CHANGED_EVENT, () => void load())
  }, [load])

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading your saved properties…</p>
  }

  if (items.length === 0) {
    return (
      <div className="card text-center">
        <h2 className="font-display text-xl text-brand-900">Nothing saved yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
          Open a listing and tap <strong>Save this property</strong> to keep it here.
        </p>
      </div>
    )
  }

  return (
    <div>
      <ul className="space-y-4">
        {items.map((item) => {
          const status = saleStatus(item.saleStatus)

          return (
            <li
              key={item.slug}
              className="flex flex-col gap-4 rounded-xl border border-sand-200 bg-sand-50 p-4 sm:flex-row"
            >
              <Link
                href={`/listing/${item.slug}`}
                className="relative h-40 w-full shrink-0 overflow-hidden rounded-lg bg-sand-200 sm:h-28 sm:w-44"
              >
                {item.coverUrl ? (
                  <Image
                    src={item.coverUrl}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 176px"
                    className="object-cover"
                  />
                ) : null}
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                      saleStatusClasses(item.saleStatus),
                    )}
                  >
                    {status.label}
                  </span>
                  <span className="truncate text-xs text-ink-muted">{item.address}</span>
                </div>

                <Link href={`/listing/${item.slug}`} className="mt-1 block">
                  <h2 className="font-display text-lg leading-snug text-brand-900 hover:text-brand-700">
                    {item.headline ?? item.address}
                  </h2>
                </Link>

                <p className="mt-1.5 font-medium text-brand-700">
                  {formatPrice(item.price, item.market)}
                </p>

                <p className="mt-1 text-sm text-ink-muted">
                  {[
                    item.beds !== null ? `${item.beds} bed` : null,
                    item.baths !== null ? `${item.baths} bath` : null,
                    item.sqft !== null ? formatArea(item.sqft, item.market) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>

              <div className="flex shrink-0 items-start">
                <button
                  type="button"
                  onClick={() => {
                    removeSaved(item.slug)
                    void load()
                  }}
                  className="text-sm text-ink-muted hover:text-ink"
                >
                  Remove
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {missing > 0 ? (
        <p className="mt-6 text-sm text-ink-muted">
          {missing} saved {missing === 1 ? 'property is' : 'properties are'} no longer available.
        </p>
      ) : null}
    </div>
  )
}
