import { asc, eq } from 'drizzle-orm'
import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { AgentCard } from '@/components/agent-card'
import { ListingGallery } from '@/components/listing-gallery'
import { ListingLeadForm } from '@/components/listing-lead-form'
import { ListingMap } from '@/components/map/listing-map'
import { ListingShare } from '@/components/listing-share'
import { SaveListingButton } from '@/components/save-listing-button'
import { MortgageEstimate } from '@/components/mortgage-estimate'
import { ViewTracker } from '@/components/view-tracker'
import { db } from '@/lib/db'
import { listingImages, listings, users } from '@/lib/db/schema'
import { splitHighlightsAndFeatures } from '@/lib/listing-content'
import { propertyTypeLabel } from '@/lib/property-types'
import { saleStatus, saleStatusClasses } from '@/lib/sale-status'
import { formatArea, formatPrice, formatPricePerArea } from '@/lib/format'
import { market } from '@/lib/markets'
import { cn } from '@/lib/utils'
import { parseVideoUrl } from '@/lib/video'

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

  const [images, agent] = await Promise.all([
    db
      .select()
      .from(listingImages)
      .where(eq(listingImages.listingId, listing.id))
      .orderBy(asc(listingImages.sortOrder)),
    // Only the public-facing columns. Email and phone are deliberately not
    // selected — buyers reach the agent through the enquiry form, so those never
    // enter the HTML of a page built to be shared widely.
    db.query.users.findFirst({
      where: eq(users.id, listing.agentId),
      columns: {
        name: true,
        headshotUrl: true,
        brokerageName: true,
        brokerageLogoUrl: true,
        licenseNumber: true,
      },
    }),
  ])

  return { listing, images, agent: agent ?? null }
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

  const { listing, images, agent } = data

  // Highlights that merely restate a feature are dropped — see lib/listing-content.ts
  const { highlights, features } = splitHighlightsAndFeatures(
    listing.aiHighlights,
    listing.features,
  )

  // Floor plans get their own section; a diagram between two room photos in the
  // carousel reads as a mistake.
  const photos = images.filter((image) => !image.isFloorPlan)
  const floorPlans = images.filter((image) => image.isFloorPlan)

  // Cover photo leads, then whatever order the agent uploaded in.
  const orderedImages = [...photos].sort(
    (a, b) => Number(b.isCover) - Number(a.isCover) || a.sortOrder - b.sortOrder,
  )

  const status = saleStatus(listing.saleStatus)
  const video = parseVideoUrl(listing.videoUrl)

  const hasSpecs = listing.beds !== null || listing.baths !== null || listing.sqft !== null

  const typeLabel = propertyTypeLabel(listing.propertyType)
  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/listing/${listing.slug}`

  const daysListed = Math.max(
    0,
    Math.floor((Date.now() - listing.createdAt.getTime()) / 86_400_000),
  )

  const activeMarket = market(listing.market)

  // Buyers compare on price per unit area in every market, so derive it rather
  // than making the agent calculate it.
  const pricePerArea = formatPricePerArea(listing.price, listing.sqft, listing.market)

  /**
   * The full detail table, HAR-style. Built as data so the markup stays flat and
   * rows with no value simply never appear — an empty row reads as broken.
   */
  const details: Array<{ label: string; value: string }> = [
    typeLabel && { label: 'Property type', value: typeLabel },
    // Bedrooms, bathrooms and living area are deliberately absent: they already
    // appear in the hero above, and repeating them makes the table look padded.
    listing.lotSize !== null && {
      label: 'Plot size',
      value: formatArea(listing.lotSize, listing.market),
    },
    listing.yearBuilt !== null && { label: 'Year built', value: String(listing.yearBuilt) },
    listing.monthlyFee !== null && {
      label: activeMarket.monthlyFeeLabel,
      value: formatPrice(listing.monthlyFee, listing.market),
    },
    pricePerArea !== null && {
      label: `Price per ${activeMarket.areaSuffix}`,
      value: pricePerArea,
    },
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

      {/**
       * Two columns from lg up: the property narrative on the left, the buyer's
       * decision tools (agent, monthly cost, map) on the right.
       *
       * The header card no longer pulls itself up over the gallery. That overlap
       * worked while the photo was directly above, but the thumbnail strip now
       * sits between them and the card was clipping it.
       */}
      <div className="mx-auto max-w-content px-6 pt-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <article className="min-w-0">
            <div className="rounded-xl border border-sand-200 bg-sand-50 p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide',
                    saleStatusClasses(listing.saleStatus),
                  )}
                >
                  {status.label}
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
                <p className="text-3xl font-medium text-brand-700">
                  {formatPrice(listing.price, listing.market)}
                </p>
                {listing.monthlyFee !== null ? (
                  <p className="text-sm text-ink-muted">
                    + {formatPrice(listing.monthlyFee, listing.market)} /month{' '}
                    {activeMarket.monthlyFeeLabel.toLowerCase()}
                  </p>
                ) : null}
                {pricePerArea !== null ? (
                  <p className="text-sm text-ink-muted">{pricePerArea}</p>
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
                      <dd className="mt-0.5 font-medium text-ink">
                        {formatArea(listing.sqft, listing.market)}
                      </dd>
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
                      <span
                        aria-hidden
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                      />
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

            {video ? (
              <section className="mt-10">
                <h2 className="font-display text-xl text-brand-900">Video tour</h2>
                <div className="mt-4 overflow-hidden rounded-xl border border-sand-200 bg-ink">
                  <iframe
                    title="Property video tour"
                    src={video.embedUrl}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    className="aspect-video w-full border-0"
                  />
                </div>
              </section>
            ) : null}

            {floorPlans.length > 0 ? (
              <section className="mt-10">
                <h2 className="font-display text-xl text-brand-900">
                  Floor plan
                  {floorPlans.length > 1 ? (
                    <span className="ml-2 text-sm font-normal text-ink-muted">
                      ({floorPlans.length})
                    </span>
                  ) : null}
                </h2>
                <ul className="mt-4 space-y-4">
                  {floorPlans.map((plan, index) => (
                    <li
                      key={plan.id}
                      className="overflow-hidden rounded-xl border border-sand-200 bg-white"
                    >
                      {/* object-contain, not cover: a cropped floor plan is useless */}
                      <Image
                        src={plan.url}
                        alt={`Floor plan ${index + 1} for ${listing.address}`}
                        width={1600}
                        height={1200}
                        sizes="(max-width: 1024px) 100vw, 720px"
                        className="h-auto w-full object-contain"
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-sand-200 pt-6">
              <p className="text-xs text-ink-muted">
                Listing prepared with Listora. Information supplied by the selling agent.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <SaveListingButton slug={listing.slug} />
                <ListingShare url={publicUrl} title={listing.aiHeadline ?? listing.address} />
              </div>
            </div>
          </article>

          <aside className="space-y-6 lg:self-start">
            <section className="card" id="contact">
              {agent ? (
                <>
                  <AgentCard agent={agent} />
                  <div className="mt-5 border-t border-sand-200 pt-5">
                    <ListingLeadForm slug={listing.slug} agentName={agent.name} />
                  </div>
                </>
              ) : (
                <ListingLeadForm slug={listing.slug} agentName="the agent" />
              )}
            </section>

            {listing.price !== null && listing.price > 0 ? (
              <MortgageEstimate
                marketId={listing.market}
                price={listing.price}
                monthlyFee={listing.monthlyFee}
              />
            ) : null}

            {/**
             * Shown only when the agent has actually pinned the location.
             *
             * This replaced a keyless Google Maps embed that guessed a position
             * from the address string. Two reasons: the guess was often wrong for
             * rural and new-build addresses with no way to correct it, and the
             * Google iframe set third-party cookies with no consent — a real
             * problem for an EU product. OpenStreetMap tiles set none.
             *
             * No pin means no map, rather than a confidently wrong one.
             */}
            {listing.latitude !== null && listing.longitude !== null ? (
              <section>
                <h2 className="font-display text-lg text-brand-900">Location</h2>
                <div className="mt-3 overflow-hidden rounded-xl border border-sand-200">
                  <ListingMap
                    latitude={listing.latitude}
                    longitude={listing.longitude}
                    label={listing.address}
                  />
                </div>
                <p className="mt-2 text-xs text-ink-muted">Pin placed by the selling agent.</p>
              </section>
            ) : null}
          </aside>
        </div>
      </div>

      {/* Sticky price + contact bar on phones, so the CTA is always one tap away */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-sand-200 bg-sand-50/95 px-4 py-3 backdrop-blur sm:hidden print:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-ink-muted">{listing.address}</p>
            <p className="font-medium text-brand-700">
              {formatPrice(listing.price, listing.market)}
            </p>
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
