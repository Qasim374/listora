import { and, asc, eq, inArray } from 'drizzle-orm'

import { db } from '@/lib/db'
import { listingImages, listings } from '@/lib/db/schema'

/** Matches the client-side cap, so one request can cover a full saved list. */
const MAX_SLUGS = 100

/**
 * Returns short summaries for a set of slugs, for the buyer's saved-listings page.
 *
 * Public and unauthenticated, because saved listings belong to an anonymous
 * buyer. Safe because:
 *   - only PUBLISHED listings are returned
 *   - the caller must already know the slug, and slugs carry a random suffix, so
 *     this cannot be used to enumerate an agent's portfolio
 *   - the response contains only what the card needs — no agent contact details
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const slugs = (body as { slugs?: unknown }).slugs

  if (!Array.isArray(slugs)) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const clean = Array.from(
    new Set(
      slugs.filter(
        (value): value is string =>
          typeof value === 'string' && value.length > 0 && value.length <= 200,
      ),
    ),
  ).slice(0, MAX_SLUGS)

  if (clean.length === 0) {
    return Response.json({ listings: [] }, { headers: { 'cache-control': 'no-store' } })
  }

  const rows = await db
    .select({
      slug: listings.slug,
      address: listings.address,
      headline: listings.aiHeadline,
      price: listings.price,
      beds: listings.beds,
      baths: listings.baths,
      sqft: listings.sqft,
      market: listings.market,
      saleStatus: listings.saleStatus,
    })
    .from(listings)
    .where(and(inArray(listings.slug, clean), eq(listings.status, 'published')))

  // One extra query for cover images rather than N — the saved list can be long.
  const covers =
    rows.length === 0
      ? []
      : await db
          .select({ listingSlug: listings.slug, url: listingImages.url })
          .from(listingImages)
          .innerJoin(listings, eq(listingImages.listingId, listings.id))
          .where(and(inArray(listings.slug, clean), eq(listingImages.isCover, true)))
          .orderBy(asc(listingImages.sortOrder))

  const coverBySlug = new Map(covers.map((row) => [row.listingSlug, row.url]))

  return Response.json(
    {
      listings: rows.map((row) => ({ ...row, coverUrl: coverBySlug.get(row.slug) ?? null })),
    },
    { headers: { 'cache-control': 'no-store' } },
  )
}
