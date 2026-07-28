import { asc, eq } from 'drizzle-orm'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ListingContact } from '@/components/listing-contact'
import { ListingGallery } from '@/components/listing-gallery'
import { ListingShare } from '@/components/listing-share'
import { MortgageEstimate } from '@/components/mortgage-estimate'
import { ViewTracker } from '@/components/view-tracker'
import { db } from '@/lib/db'
import { listingImages, listings } from '@/lib/db/schema'
import { propertyTypeLabel } from '@/lib/property-types'
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

  const typeLabel = propertyTypeLabel(listing.propertyType)
  const features = listing.features ?? []
  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/listing/${listing.slug}`

  const daysListed = Math.max(
    0,
    Math.floor((Date.now() - listing.createdAt.getTime()) / 86_400_000),
  )

  // Buyers in Sweden compare on kr/m², so derive it rather than making the
  // agent calculate it. Only meaningful when both numbers are present.
  const pricePerSqm =
    listing.price !== null && listing.sqft !== null && listing.sqft > 0
      ? Math.round(listing.price / listing.sqft)
      : null

  /**
   * The full detail table, HAR-style. Built as data so the markup stays flat and
   * rows with no value simply never appear — an empty row reads as broken.
   */
  const details: Array<{ label: string; value: string }> = [
    typeLabel && { label: 'Property type', value: typeLabel },
    // Bedrooms, bathrooms and living area are deliberately absent: they already
    // appear in the hero above, and repeating them makes the table look padded.
    listing.lotSize !== null && { label: 'Plot size', value: formatSqft(listing.lotSize) },
    listing.yearBuilt !== null && { label: 'Year built', value: String(listing.yearBuilt) },
    listing.monthlyFee !== null && {
      label: 'Monthly fee',
      value: formatPrice(listing.monthlyFee),
    },
    pricePerSqm !== null && { label: 'Price per m²', value: formatPrice(pricePerSqm) },
    // Derived from the id, not the slug: a slug tail like "TAN-14" is a
    // meaningless fragment of the address, while the id is always clean hex.
    { label: 'Reference', value: `LST-${listing.id.replace(/-/g, '').slice(0, 6).toUpperCase()}` },
  ].filter((row): row is { label: string; value: string } => Boolean(row))

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
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-brand-700">
              For sale
            </span>
            {typeLabel ? (
              <span className="rounded-full bg-sand-200 px-2.5 py-0.5 text-xs font-medium text-ink-soft">
                {typeLabel}
              </span>
            ) : null}
            <span className="text-xs text-ink-muted">
              {daysListed === 0 ? 'Listed today' : `Listed ${daysListed} days ago`}
            </span>
          </div>

          <p className="mt-3 text-sm text-ink-muted">{listing.address}</p>

          <h1 className="mt-2 font-display text-3xl leading-tight text-brand-900 sm:text-4xl">
            {listing.aiHeadline ?? listing.address}
          </h1>

          <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="text-3xl font-medium text-brand-700">{formatPrice(listing.price)}</p>
            {listing.monthlyFee !== null ? (
              <p className="text-sm text-ink-muted">
                + {formatPrice(listing.monthlyFee)} / month fee
              </p>
            ) : null}
            {pricePerSqm !== null ? (
              <p className="text-sm text-ink-muted">{formatPrice(pricePerSqm)} / m²</p>
            ) : null}
          </div>

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

        <section className="mt-10">
          <h2 className="font-display text-xl text-brand-900">Property details</h2>
          <dl className="mt-4 overflow-hidden rounded-xl border border-sand-200 bg-sand-50">
            {details.map((row, index) => (
              <div
                key={row.label}
                className={
                  index % 2 === 0
                    ? 'flex justify-between gap-4 px-5 py-3 text-sm'
                    : 'flex justify-between gap-4 bg-sand-100/70 px-5 py-3 text-sm'
                }
              >
                <dt className="text-ink-muted">{row.label}</dt>
                <dd className="text-right font-medium text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {features.length > 0 ? (
          <section className="mt-10">
            <h2 className="font-display text-xl text-brand-900">Features</h2>
            <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-ink-soft">
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand-500"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {listing.price !== null && listing.price > 0 ? (
          <MortgageEstimate price={listing.price} monthlyFee={listing.monthlyFee} />
        ) : null}

        <section className="mt-10">
          <h2 className="font-display text-xl text-brand-900">Location</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-sand-200">
            {/* Keyless Google Maps embed. No geocoding step and no API key to
                manage; the address string is all it needs. */}
            <iframe
              title={`Map of ${listing.address}`}
              src={`https://maps.google.com/maps?q=${encodeURIComponent(listing.address)}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-72 w-full border-0"
            />
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Map position is approximate, based on the address supplied by the agent.
          </p>
        </section>

        <section className="card mt-12 text-center" id="contact">
          <ListingContact slug={listing.slug} />
        </section>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-sand-200 pt-6">
          <p className="text-xs text-ink-muted">
            Listing prepared with Listora. Information supplied by the selling agent.
          </p>
          <ListingShare url={publicUrl} title={listing.aiHeadline ?? listing.address} />
        </div>
      </article>

      {/* Sticky price + contact bar on phones, so the CTA is always one tap away */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-sand-200 bg-sand-50/95 px-4 py-3 backdrop-blur sm:hidden print:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-ink-muted">{listing.address}</p>
            <p className="font-medium text-brand-700">{formatPrice(listing.price)}</p>
          </div>
          <a href="#contact" className="btn-primary shrink-0">
            Contact agent
          </a>
        </div>
      </div>

      <ViewTracker slug={listing.slug} />
    </main>
  )
}
