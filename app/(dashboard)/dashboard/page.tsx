import { desc, eq } from 'drizzle-orm'
import Link from 'next/link'

import { getCurrentAgent } from '@/lib/auth/current-agent'
import { db } from '@/lib/db'
import { listings } from '@/lib/db/schema'
import { getPlan } from '@/lib/plans'
import { getQuotaStatus } from '@/lib/quota'
import { formatPrice } from '@/lib/utils'

export const metadata = { title: 'Your listings' }

// Per-agent data — must never be prerendered or cached across requests.
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const agent = await getCurrentAgent()

  if (!agent) {
    return (
      <div className="card">
        <h1 className="font-display text-2xl text-brand-900">Not signed in</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Set <code className="font-mono">SKIP_AUTH=true</code> and{' '}
          <code className="font-mono">DEV_AGENT_ID</code> in <code>.env.local</code>, or wait for
          the auth step.
        </p>
      </div>
    )
  }

  const [rows, quota] = await Promise.all([
    db
      .select()
      .from(listings)
      .where(eq(listings.agentId, agent.id))
      .orderBy(desc(listings.createdAt)),
    getQuotaStatus(agent),
  ])

  const plan = getPlan(agent.subscriptionTier)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-brand-900">Your listings</h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            {plan.name} plan — {quota.used} of {quota.limit} used this period
          </p>
        </div>

        {quota.canCreate ? (
          <Link href="/dashboard/listings/new" className="btn-primary">
            New listing
          </Link>
        ) : (
          <span className="text-sm text-ink-muted">
            Listing limit reached for this period
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="card mt-8 text-center">
          <h2 className="font-display text-xl text-brand-900">No listings yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            Once the upload flow is in, this is where your listings will appear — each with its
            shareable link and view count.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {rows.map((listing) => (
            <li key={listing.id} className="card flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate font-medium text-ink">
                    {listing.aiHeadline ?? listing.address}
                  </h2>
                  <span
                    className={
                      listing.status === 'published'
                        ? 'rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700'
                        : 'rounded-full bg-sand-200 px-2 py-0.5 text-xs text-ink-muted'
                    }
                  >
                    {listing.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-ink-muted">
                  {listing.address} · {formatPrice(listing.price)} · {listing.viewCount} views
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <Link href={`/dashboard/listings/${listing.id}`} className="btn-secondary">
                  Edit
                </Link>
                {/* Drafts have no public page yet — linking there would 404 */}
                {listing.status === 'published' ? (
                  <Link
                    href={`/listing/${listing.slug}`}
                    className="btn-secondary"
                    target="_blank"
                  >
                    View page
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
