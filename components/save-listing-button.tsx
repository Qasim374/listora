'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { isSaved, readSaved, SAVED_CHANGED_EVENT, toggleSaved } from '@/lib/saved-listings'
import { cn } from '@/lib/utils'

export function SaveListingButton({ slug }: { slug: string }) {
  /**
   * `mounted` prevents a hydration mismatch: the server has no localStorage, so
   * it cannot know whether this listing is saved. Rendering the unsaved state on
   * both sides and correcting after mount is what keeps React quiet.
   */
  const [mounted, setMounted] = useState(false)
  const [saved, setSaved] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    setMounted(true)

    function sync() {
      setSaved(isSaved(slug))
      setCount(readSaved().length)
    }

    sync()

    // Keeps two open tabs in agreement: 'storage' fires in other tabs, our own
    // event fires in this one.
    window.addEventListener(SAVED_CHANGED_EVENT, sync)
    window.addEventListener('storage', sync)

    return () => {
      window.removeEventListener(SAVED_CHANGED_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [slug])

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => {
          const next = toggleSaved(slug)
          setSaved(next)
          setCount(readSaved().length)
        }}
        aria-pressed={mounted ? saved : false}
        className={cn(
          'btn inline-flex items-center gap-2',
          mounted && saved
            ? 'border border-brand-500 bg-brand-50 text-brand-800'
            : 'border border-sand-300 bg-sand-50 text-ink hover:bg-sand-200',
        )}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="h-4 w-4"
          fill={mounted && saved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M12 21s-7.5-4.9-9.3-9.2C1.2 8.3 3.1 5 6.4 5c2 0 3.3 1.1 4.1 2.3l.7 1 .7-1C12.7 6.1 14 5 16 5c3.3 0 5.2 3.3 3.7 6.8C19.5 16.1 12 21 12 21z" />
        </svg>
        {mounted && saved ? 'Saved' : 'Save this property'}
      </button>

      {mounted && count > 0 ? (
        <Link href="/saved" className="text-sm text-brand-600 hover:text-brand-700">
          View saved ({count})
        </Link>
      ) : null}
    </div>
  )
}
