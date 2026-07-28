import Link from 'next/link'

import { ListingForm } from '@/components/listing-form'
import { getCurrentAgent } from '@/lib/auth/current-agent'
import { isBlobConfigured } from '@/lib/blob'
import { getQuotaStatus } from '@/lib/quota'

export const metadata = { title: 'New listing' }
export const dynamic = 'force-dynamic'

export default async function NewListingPage() {
  const agent = await getCurrentAgent()

  if (!agent) {
    return (
      <div className="card">
        <h1 className="font-display text-2xl text-brand-900">Not signed in</h1>
      </div>
    )
  }

  const quota = await getQuotaStatus(agent)

  if (!quota.canCreate) {
    return (
      <div className="card max-w-xl">
        <h1 className="font-display text-2xl text-brand-900">Listing limit reached</h1>
        <p className="mt-3 text-sm text-ink-soft">
          You&apos;ve used all {quota.limit} listings included in your plan for this period.
          Upgrading raises the limit immediately.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/dashboard" className="btn-secondary">
            Back to listings
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink">
        ← Back to listings
      </Link>

      <h1 className="mt-4 font-display text-3xl text-brand-900">New listing</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Add the facts and your rough notes. Polished copy comes next — you&apos;ll be able to edit
        it before anything goes live.
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        {quota.remaining} of {quota.limit} listings remaining this period.
      </p>

      <div className="mt-8">
        <ListingForm uploadsEnabled={isBlobConfigured()} />
      </div>
    </div>
  )
}
