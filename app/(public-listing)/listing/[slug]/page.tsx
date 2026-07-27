import { asc, eq } from 'drizzle-orm'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ListingGallery } from '@/components/listing-gallery'
import { db } from '@/lib/db'
import { listingImages, listings } from '@/lib/db/schema'
import { formatPrice, formatSqft } from '@/lib/utils'

type PageProps = {
  // Next 15 passes params as a Promise
  params: Promise<{ slug: string }>
}

// Rendered on demand. Once traffic justifies it this can become ISR with a
// revalidate window, but only after view-counting moves off the render path.
export const dynamic = 'force-dynamic'

async function getListing(slug: string) {
  const listing = await db.query.listings.findFirst({
    where: eq(listings.slug, slug),
  })

  if (!listing || listing.status !== 'published') return null

  const images = await db
    .select()
    .from(listingImages)
    .where(eq(listingImages.listingId, listing.id))
    .orderBy(asc(listingImages.sortOrder))

  return { listing, images }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await getListing(slug)

  if (!data) return { title: 'Listing not found' }

  const { listing } = data

  return {
    title: listing.aiHeadline ?? listing.address,
    description: listing.aiDescription?.slice(0, 155) ?? listing.address,
    openGraph: {
      title: listing.aiHeadline ?? listing.address,
      description: listing.aiDescription?.slice(0, 155) ?? listing.address,
    },
  }
}

/**
 * Public listing page — no login required.
 *
 * View-count incrementing is deliberately NOT done here. Doing it during render
 * breaks the moment this page gets cached or statically revalidated, and it
 * double-counts on React strict-mode double-renders. It goes in a separate
 * fire-and-forget route hit from the client in step 6.
 */
export default async function PublicListingPage({ params }: PageProps) {
  const { slug } = await params
  const data = await getListing(slug)

  if (!data) notFound()

  const { listing, images } = data
  const highlights = listing.aiHighlights ?? []

  // Cover photo leads, then whatever order the agent uploaded in.
  const orderedImages = [...images].sort(
    (a, b) => Number(b.isCover) - Number(a.isCover) || a.sortOrder - b.sortOrder,
  )

  const hasSpecs = listing.beds !== null || listing.baths !== null || listing.sqft !== null

  return (
    <main className="min-h-screen bg-sand-100 pb-20">
      <ListingGallery
        images={orderedImages.map((image) => ({ id: image.id, url: image.url }))}
        alt={listing.aiHeadline ?? listing.address}
      />

      <article className="mx-auto max-w-3xl px-6">
        {/* relative+z-10 so the card paints cleanly over the photo it overlaps,
            and the smaller offset keeps the address clear of the image edge. */}
        <div className="relative z-10 -mt-6 rounded-xl border border-sand-200 bg-sand-50 p-6 shadow-sm sm:p-8">
          <p className="text-sm text-ink-muted">{listing.address}</p>

          <h1 className="mt-2 font-display text-3xl leading-tight text-brand-900 sm:text-4xl">
            {listing.aiHeadline ?? listing.address}
          </h1>

          <p className="mt-4 text-2xl font-medium text-brand-700">
            {formatPrice(listing.price)}
          </p>

          {/* Hidden entirely when the agent supplied none of these — a row of
              three em-dashes reads as a broken page, not as "not specified". */}
          {hasSpecs ? (
            <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-sand-200 pt-6 text-sm">
              {listing.beds !== null ? (
                <div>
                  <dt className="text-ink-muted">Bedrooms</dt>
                  <dd className="mt-0.5 font-medium text-ink">{listing.beds}</dd>
                </div>
              ) : null}
              {listing.baths !== null ? (
                <div>
                  <dt className="text-ink-muted">Bathrooms</dt>
                  <dd className="mt-0.5 font-medium text-ink">{listing.baths}</dd>
                </div>
              ) : null}
              {listing.sqft !== null ? (
                <div>
                  <dt className="text-ink-muted">Living area</dt>
                  <dd className="mt-0.5 font-medium text-ink">{formatSqft(listing.sqft)}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>

        {highlights.length > 0 ? (
          <section className="mt-10">
            <h2 className="font-display text-xl text-brand-900">Highlights</h2>
            <ul className="mt-4 space-y-2.5">
              {highlights.map((highlight) => (
                <li key={highlight} className="flex gap-3 text-ink-soft">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {listing.aiDescription ? (
          <section className="mt-10">
            <h2 className="font-display text-xl text-brand-900">About this property</h2>
            <div className="mt-4 space-y-4 leading-relaxed text-ink-soft">
              {listing.aiDescription.split(/\n\s*\n/).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </section>
        ) : null}

        <section className="card mt-12 text-center">
          <h2 className="font-display text-xl text-brand-900">Interested in a viewing?</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Get in touch with the agent to arrange a time.
          </p>
          <button type="button" className="btn-primary mt-5" disabled>
            Contact agent
          </button>
        </section>
      </article>
    </main>
  )
}
