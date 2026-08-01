'use server'

import { redirect } from 'next/navigation'

import { requireAgent } from '@/lib/auth/current-agent'
import { db } from '@/lib/db'
import { listingImages, listings } from '@/lib/db/schema'
import { buildImageRows } from '@/lib/listing-images'
import { getQuotaStatus } from '@/lib/quota'
import { listingFormSchema } from '@/lib/validation'
import { slugifyAddress } from '@/lib/utils'

export type CreateListingResult = {
  ok: false
  error: string
  fieldErrors?: Record<string, string>
}

export async function createListing(raw: unknown): Promise<CreateListingResult> {
  const agent = await requireAgent()

  const parsed = listingFormSchema.safeParse(raw)

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}

    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.')
      // Keep the first message per field — later ones are usually noise
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
    }

    return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors }
  }

  /**
   * Quota is re-checked here, not just in the page that rendered the form.
   * The page check controls what the UI offers; this one is the actual gate.
   * Without it, a stale tab or a direct action call bypasses the limit.
   */
  const quota = await getQuotaStatus(agent)

  if (!quota.canCreate) {
    return {
      ok: false,
      error: `You've used all ${quota.limit} listings on your plan this period. Upgrade to add more.`,
    }
  }

  const values = parsed.data
  let listingId: string

  try {
    const [listing] = await db
      .insert(listings)
      .values({
        agentId: agent.id,
        slug: slugifyAddress(values.address),
        address: values.address,
        price: values.price,
        beds: values.beds,
        // numeric columns round-trip as strings in Drizzle
        baths: values.baths === null ? null : String(values.baths),
        sqft: values.sqft,
        propertyType: values.propertyType,
        yearBuilt: values.yearBuilt,
        lotSize: values.lotSize,
        monthlyFee: values.monthlyFee,
        features: values.features,
        videoUrl: values.videoUrl,
        saleStatus: values.saleStatus,
        rawDescription: values.rawDescription,
        status: 'draft',
      })
      .returning({ id: listings.id })

    listingId = listing.id

    if (values.images.length > 0) {
      await db.insert(listingImages).values(buildImageRows(listing.id, values.images))
    }
  } catch (error) {
    console.error('Failed to create listing', error)
    return { ok: false, error: 'Could not save the listing. Please try again.' }
  }

  // Outside the try block: redirect() signals by throwing, so catching it here
  // would swallow the navigation and report a false error.
  redirect(`/dashboard/listings/${listingId}`)
}
