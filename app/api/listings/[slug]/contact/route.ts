import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { listings, users } from '@/lib/db/schema'

/**
 * Returns the agent's contact details for a PUBLISHED listing.
 *
 * Why this is a route instead of props on the public page: rendering an agent's
 * email into the page HTML hands it to every crawler that indexes the listing,
 * and the whole point of Listora is that these links get shared widely. Fetching
 * on click keeps addresses out of the page source while still being one tap for
 * a real buyer.
 *
 * Drafts return 404 — an unpublished listing must not leak its agent either.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params

  const [row] = await db
    .select({
      status: listings.status,
      name: users.name,
      email: users.email,
      phone: users.phone,
    })
    .from(listings)
    .innerJoin(users, eq(listings.agentId, users.id))
    .where(eq(listings.slug, slug))
    .limit(1)

  if (!row || row.status !== 'published') {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  return Response.json(
    { name: row.name, email: row.email, phone: row.phone },
    // Never cache: an agent updating their number must take effect immediately,
    // and a shared CDN cache could serve one agent's details for another.
    { headers: { 'cache-control': 'no-store' } },
  )
}
