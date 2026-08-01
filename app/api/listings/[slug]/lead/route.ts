import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { leads, listings } from '@/lib/db/schema'
import { leadSchema } from '@/lib/validation'

/**
 * Accepts a buyer enquiry from a public listing page.
 *
 * Unauthenticated by design — the whole point is that buyers need no account.
 * That makes it the most exposed endpoint in the app, so:
 *   - only PUBLISHED listings accept enquiries
 *   - the honeypot field rejects form-filling bots
 *   - every field is length-capped by leadSchema
 *   - the response never reveals whether the listing exists
 *
 * Still missing: per-IP rate limiting. A determined script could flood an
 * agent's inbox. That needs shared state (Upstash/Vercel KV) and is noted as an
 * open item rather than pretended away.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const parsed = leadSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Please check the form' },
      { status: 400 },
    )
  }

  // Honeypot tripped: accept silently so the bot doesn't learn to adapt.
  if (parsed.data.website) {
    return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } })
  }

  const listing = await db.query.listings.findFirst({ where: eq(listings.slug, slug) })

  if (!listing || listing.status !== 'published') {
    return Response.json({ error: 'This listing is no longer available' }, { status: 404 })
  }

  try {
    await db.insert(leads).values({
      listingId: listing.id,
      agentId: listing.agentId,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      message: parsed.data.message,
    })
  } catch (error) {
    console.error('Failed to save lead', error)
    return Response.json(
      { error: 'Could not send your message. Please try again.' },
      { status: 500 },
    )
  }

  return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } })
}
