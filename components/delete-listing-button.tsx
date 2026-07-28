'use client'

import { useState, useTransition } from 'react'

import { deleteListing } from '@/app/(dashboard)/dashboard/listings/[id]/actions'

/**
 * Two-step delete. Deletion is irreversible and also removes the uploaded
 * photos, so a single misclick must not be enough — the agent has to confirm
 * against the address they are about to lose.
 */
export function DeleteListingButton({
  listingId,
  address,
}: {
  listingId: string
  address: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="btn-secondary text-accent"
      >
        Delete
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-accent bg-accent-soft/20 p-4">
      <p className="text-sm font-medium text-ink">Delete this listing permanently?</p>
      <p className="mt-1 text-sm text-ink-soft">
        {address} — the listing, its photos and its public link will be removed. Anyone holding the
        link will see a “not available” page. This cannot be undone.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              // On success the action redirects, so nothing comes back.
              const result = await deleteListing(listingId)
              if (result && !result.ok) setError(result.error)
            })
          }
          className="btn-primary bg-accent hover:bg-accent/90"
        >
          {pending ? 'Deleting…' : 'Yes, delete it'}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-accent">
          {error}
        </p>
      ) : null}
    </div>
  )
}
