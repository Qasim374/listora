import { and, asc, eq } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { DeleteListingButton } from '@/components/delete-listing-button'
import { ListingCopyEditor } from '@/components/listing-copy-editor'
import { getCurrentAgent } from '@/lib/auth/current-agent'
import { db } from '@/lib/db'
import { listingImages, listings } from '@/lib/db/schema'
import { formatPrice, formatSqft } from '@/lib/utils'

export const dynamic = 'force-dynamic'
// Generation is ~1-2s on Groq, but a slower provider (or a retry) shouldn't be
// cut off by the platform default.
export const maxDuration = 60

type PageProps = { params: Promise<{ id: string }> }

export default async function ListingDraftPage({ params }: PageProps) {
  const { id } = await params
  const agent = await getCurrentAgent()

  if (!agent) notFound()

  /**
   * Scoped by agentId as well as id. Querying on the UUID alone would let any
   * signed-in agent read another agent's draft by guessing or leaking an id.
   */
  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, id), eq(listings.agentId, agent.id)),
  })

  if (!listing) notFound()

  const images = await db
    .select()
    .from(listingImages)
    .where(eq(listingImages.listingId, listing.id))
    .orderBy(asc(listingImages.sortOrder))

  // Absolute URL so the agent can paste the link straight into an email or SMS.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink">
        ← Back to listings
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-brand-900">{listing.address}</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            {listing.status === 'published' ? 'Published' : 'Draft'} · saved{' '}
            {listing.createdAt.toLocaleDateString('sv-SE')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {listing.status === 'published' ? (
            <Link href={`/listing/${listing.slug}`} target="_blank" className="btn-secondary">
              View public page
            </Link>
          ) : null}
          <Link href={`/dashboard/listings/${listing.id}/edit`} className="btn-secondary">
            Edit details
          </Link>
        </div>
      </div>

      <dl className="card mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-muted">Price</dt>
          <dd className="mt-1 font-medium text-ink">{formatPrice(listing.price)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-muted">Bedrooms</dt>
          <dd className="mt-1 font-medium text-ink">{listing.beds ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-muted">Bathrooms</dt>
          <dd className="mt-1 font-medium text-ink">{listing.baths ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-muted">Living area</dt>
          <dd className="mt-1 font-medium text-ink">{formatSqft(listing.sqft)}</dd>
        </div>
      </dl>

      {images.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-display text-lg text-brand-900">
            Photos <span className="text-sm font-normal text-ink-muted">({images.length})</span>
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((image) => (
              <li
                key={image.id}
                className="relative overflow-hidden rounded-lg border border-sand-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt=""
                  className="aspect-[4/3] w-full bg-sand-200 object-cover"
                />
                {image.isCover ? (
                  <span className="absolute left-1.5 top-1.5 rounded bg-brand-700 px-1.5 py-0.5 text-[10px] font-medium text-sand-50">
                    Cover
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="font-display text-lg text-brand-900">Your notes</h2>
        <p className="card mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
          {listing.rawDescription}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg text-brand-900">Listing copy</h2>
        <div className="mt-3">
          <ListingCopyEditor
            listingId={listing.id}
            slug={listing.slug}
            status={listing.status}
            headline={listing.aiHeadline}
            description={listing.aiDescription}
            highlights={listing.aiHighlights ?? []}
            publicUrl={`${appUrl}/listing/${listing.slug}`}
          />
        </div>
      </section>

      <section className="mt-12 border-t border-sand-200 pt-6">
        <h2 className="font-display text-lg text-brand-900">Danger zone</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Deleting removes the listing, its photos and its public link for good.
        </p>
        <div className="mt-4">
          <DeleteListingButton listingId={listing.id} address={listing.address} />
        </div>
      </section>
    </div>
  )
}
