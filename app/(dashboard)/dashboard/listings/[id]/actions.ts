'use server'

import { del } from '@vercel/blob'
import { and, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { AiGenerationError, generateListingCopy } from '@/lib/ai'
import { requireAgent } from '@/lib/auth/current-agent'
import { db } from '@/lib/db'
import { listingImages, listings, type Listing } from '@/lib/db/schema'
import { buildImageRows } from '@/lib/listing-images'
import { listingCopyEditSchema, listingFormSchema } from '@/lib/validation'

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: never } : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

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

/**
 * Removes blobs that are no longer referenced by any listing.
 *
 * Vercel Blob is billed by stored bytes, so an image dropped during an edit
 * would otherwise be paid for forever with nothing linking to it. Checked
 * against the whole table rather than just this listing, because the same URL
 * could in principle be reused.
 *
 * Failures are logged, never thrown: a storage hiccup must not fail the edit the
 * agent actually asked for.
 */
async function deleteOrphanedBlobs(urls: string[]) {
  if (urls.length === 0) return

  try {
    const stillReferenced = await db
      .select({ url: listingImages.url })
      .from(listingImages)
      .where(inArray(listingImages.url, urls))

    const keep = new Set(stillReferenced.map((row) => row.url))
    const orphans = urls.filter((url) => !keep.has(url))

    if (orphans.length > 0) await del(orphans)
  } catch (error) {
    console.error('Failed to delete orphaned blobs', error)
  }
}

/** Updates the property facts, notes and photos. Generated copy is untouched. */
export async function updateListing(listingId: string, raw: unknown): Promise<ActionResult> {
  let listing: Listing

  try {
    listing = await loadOwnedListing(listingId)
  } catch {
    return { ok: false, error: 'Listing not found.' }
  }

  const parsed = listingFormSchema.safeParse(raw)

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}

    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.')
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
    }

    return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors }
  }

  const values = parsed.data

  try {
    const previousImages = await db
      .select({ url: listingImages.url })
      .from(listingImages)
      .where(eq(listingImages.listingId, listing.id))

    await db
      .update(listings)
      .set({
        // The slug is deliberately NOT regenerated from a changed address:
        // agents have already sent the old link to buyers, and changing it
        // would break every one of those links.
        address: values.address,
        price: values.price,
        beds: values.beds,
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
        updatedAt: new Date(),
      })
      .where(eq(listings.id, listing.id))

    // Replace the image set wholesale: the URL is the identity, so there is
    // nothing to preserve in the old rows.
    await db.delete(listingImages).where(eq(listingImages.listingId, listing.id))

    if (values.images.length > 0) {
      await db.insert(listingImages).values(buildImageRows(listing.id, values.images))
    }

    const removed = previousImages
      .map((row) => row.url)
      .filter((url) => !values.images.some((image) => image.url === url))

    await deleteOrphanedBlobs(removed)
  } catch (error) {
    console.error('Failed to update listing', error)
    return { ok: false, error: 'Could not save the changes. Please try again.' }
  }

  revalidate(listing)
  return { ok: true }
}

/** Permanently deletes the listing, its image rows, and its stored photos. */
export async function deleteListing(listingId: string): Promise<ActionResult> {
  let listing: Listing

  try {
    listing = await loadOwnedListing(listingId)
  } catch {
    return { ok: false, error: 'Listing not found.' }
  }

  try {
    const images = await db
      .select({ url: listingImages.url })
      .from(listingImages)
      .where(eq(listingImages.listingId, listing.id))

    // listing_images rows cascade on delete
    await db.delete(listings).where(eq(listings.id, listing.id))

    await deleteOrphanedBlobs(images.map((row) => row.url))
  } catch (error) {
    console.error('Failed to delete listing', error)
    return { ok: false, error: 'Could not delete the listing. Please try again.' }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/listing/${listing.slug}`)

  // Outside try/catch: redirect() signals by throwing.
  redirect('/dashboard')
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
