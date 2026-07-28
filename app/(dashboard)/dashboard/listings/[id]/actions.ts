'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { AiGenerationError, generateListingCopy } from '@/lib/ai'
import { requireAgent } from '@/lib/auth/current-agent'
import { db } from '@/lib/db'
import { listings, type Listing } from '@/lib/db/schema'
import { listingCopyEditSchema } from '@/lib/validation'

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: never } : { data: T }))
  | { ok: false; error: string }

/**
 * Every action re-loads the listing scoped by BOTH id and agentId. A listing id
 * is a bearer token otherwise: anyone who learns one could generate copy on, or
 * publish, someone else's draft.
 */
async function loadOwnedListing(listingId: string): Promise<Listing> {
  const agent = await requireAgent()

  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.agentId, agent.id)),
  })

  if (!listing) {
    throw new Error('Listing not found')
  }

  return listing
}

function revalidate(listing: Listing) {
  revalidatePath(`/dashboard/listings/${listing.id}`)
  revalidatePath('/dashboard')
  revalidatePath(`/listing/${listing.slug}`)
}

/** Generates (or regenerates) copy from the agent's raw notes and saves it. */
export async function generateCopy(listingId: string): Promise<ActionResult> {
  let listing: Listing

  try {
    listing = await loadOwnedListing(listingId)
  } catch {
    return { ok: false, error: 'Listing not found.' }
  }

  try {
    const copy = await generateListingCopy({
      address: listing.address,
      rawDescription: listing.rawDescription,
      price: listing.price,
      beds: listing.beds,
      // numeric comes back as a string from Postgres
      baths: listing.baths === null ? null : Number(listing.baths),
      sqft: listing.sqft,
      propertyType: listing.propertyType,
      yearBuilt: listing.yearBuilt,
      lotSize: listing.lotSize,
      monthlyFee: listing.monthlyFee,
      features: listing.features,
    })

    await db
      .update(listings)
      .set({
        aiHeadline: copy.headline,
        aiDescription: copy.description,
        aiHighlights: copy.highlights,
        updatedAt: new Date(),
      })
      .where(eq(listings.id, listing.id))
  } catch (error) {
    if (error instanceof AiGenerationError) {
      // Surface the provider's own complaint — "model X can't do JSON" is far
      // more actionable than a generic failure message.
      console.error('AI generation failed', error, error.cause)
      return { ok: false, error: `Generation failed: ${error.message}` }
    }

    console.error('AI generation failed', error)
    return { ok: false, error: 'Generation failed. Please try again.' }
  }

  revalidate(listing)
  return { ok: true }
}

/** Saves the agent's edits to the copy. */
export async function saveCopy(listingId: string, raw: unknown): Promise<ActionResult> {
  let listing: Listing

  try {
    listing = await loadOwnedListing(listingId)
  } catch {
    return { ok: false, error: 'Listing not found.' }
  }

  const parsed = listingCopyEditSchema.safeParse(raw)

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid copy.' }
  }

  try {
    await db
      .update(listings)
      .set({
        aiHeadline: parsed.data.headline,
        aiDescription: parsed.data.description,
        // Drop blanks left behind by removing a highlight row
        aiHighlights: parsed.data.highlights.filter((h) => h.length > 0),
        updatedAt: new Date(),
      })
      .where(eq(listings.id, listing.id))
  } catch (error) {
    console.error('Failed to save copy', error)
    return { ok: false, error: 'Could not save. Please try again.' }
  }

  revalidate(listing)
  return { ok: true }
}

/** Makes the listing publicly visible at /listing/[slug]. */
export async function publishListing(listingId: string): Promise<ActionResult> {
  let listing: Listing

  try {
    listing = await loadOwnedListing(listingId)
  } catch {
    return { ok: false, error: 'Listing not found.' }
  }

  // Publishing an empty page would give the agent a dead link to send buyers.
  if (!listing.aiHeadline || !listing.aiDescription) {
    return { ok: false, error: 'Generate the listing copy before publishing.' }
  }

  try {
    await db
      .update(listings)
      .set({ status: 'published', updatedAt: new Date() })
      .where(eq(listings.id, listing.id))
  } catch (error) {
    console.error('Failed to publish', error)
    return { ok: false, error: 'Could not publish. Please try again.' }
  }

  revalidate(listing)
  return { ok: true }
}

/** Takes the listing back offline. Existing links stop resolving. */
export async function unpublishListing(listingId: string): Promise<ActionResult> {
  let listing: Listing

  try {
    listing = await loadOwnedListing(listingId)
  } catch {
    return { ok: false, error: 'Listing not found.' }
  }

  try {
    await db
      .update(listings)
      .set({ status: 'draft', updatedAt: new Date() })
      .where(eq(listings.id, listing.id))
  } catch (error) {
    console.error('Failed to unpublish', error)
    return { ok: false, error: 'Could not unpublish. Please try again.' }
  }

  revalidate(listing)
  return { ok: true }
}
