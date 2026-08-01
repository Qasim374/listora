import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { leads, listings, users } from '@/lib/db/schema'
import { sendEmail } from '@/lib/email'
import { leadSchema, type LeadInput } from '@/lib/validation'

async function notifyAgent(
  agentId: string,
  slug: string,
  address: string,
  lead: LeadInput,
): Promise<void> {
  try {
    const agent = await db.query.users.findFirst({
      where: eq(users.id, agentId),
      columns: { name: true, email: true },
    })

    if (!agent) return

    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const reply = [lead.email, lead.phone].filter(Boolean).join(' · ')

    await sendEmail({
      to: agent.email,
      subject: `New enquiry: ${address}`,
      text: `${lead.name} enquired about ${address}.

Contact: ${reply}

Their message:
${lead.message}

See all your enquiries:
${base}/dashboard/leads

The listing:
${base}/listing/${slug}`,
    })
  } catch (error) {
    console.error('Failed to notify agent of new lead', error)
  }
}

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

  /**
   * Notify the agent — awaited, but its failure is swallowed.
   *
   * The lead is already safely in the database, so a bounced email must not turn
   * into an error for the buyer, who would then send it again. Awaiting rather
   * than firing into the void because serverless functions can be frozen the
   * moment the response is returned, which would silently drop the request.
   */
  await notifyAgent(listing.agentId, listing.slug, listing.address, parsed.data)

  return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } })
}
