import { and, asc, eq } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ListingForm } from '@/components/listing-form'
import { getCurrentAgent } from '@/lib/auth/current-agent'
import { isBlobConfigured } from '@/lib/blob'
import { db } from '@/lib/db'
import { listingImages, listings } from '@/lib/db/schema'

export const metadata = { title: 'Edit listing' }
export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ id: string }> }

export default async function EditListingPage({ params }: PageProps) {
  const { id } = await params
  const agent = await getCurrentAgent()

  if (!agent) notFound()

  // Scoped by agentId as well as id — see the note in the draft page.
  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, id), eq(listings.agentId, agent.id)),
  })

  if (!listing) notFound()

  const images = await db
    .select()
    .from(listingImages)
    .where(eq(listingImages.listingId, listing.id))
    .orderBy(asc(listingImages.sortOrder))

  return (
    <div className="max-w-3xl">
      <Link
        href={`/dashboard/listings/${listing.id}`}
        className="text-sm text-ink-muted hover:text-ink"
      >
        ← Back to listing
      </Link>

      <h1 className="mt-4 font-display text-3xl text-brand-900">Edit listing</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Changes to the facts and notes do not rewrite the published copy. Regenerate it from the
        listing page if you want the description updated too.
      </p>

      <div className="mt-8">
        <ListingForm
          uploadsEnabled={isBlobConfigured()}
          defaultMarket={agent.market}
          initial={{
            market: listing.market,
            id: listing.id,
            address: listing.address,
            price: listing.price,
            beds: listing.beds,
            baths: listing.baths,
            sqft: listing.sqft,
            propertyType: listing.propertyType,
            yearBuilt: listing.yearBuilt,
            lotSize: listing.lotSize,
            monthlyFee: listing.monthlyFee,
            features: listing.features,
            saleStatus: listing.saleStatus,
            videoUrl: listing.videoUrl,
            latitude: listing.latitude,
            longitude: listing.longitude,
            rawDescription: listing.rawDescription,
            images: images.map((image) => ({
              id: image.id,
              url: image.url,
              isCover: image.isCover,
              isFloorPlan: image.isFloorPlan,
            })),
          }}
        />
      </div>
    </div>
  )
}
