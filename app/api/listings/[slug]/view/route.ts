import { and, eq, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import { listings } from '@/lib/db/schema'

/**
 * Bots that fetch pages to build link previews or search indexes.
 *
 * Without this, sending one listing over WhatsApp shows "3 views" before any
 * human opens it — WhatsApp, Facebook and Google each fetch the page for the
 * preview card. An inflated number is worse than no number: the agent makes
 * decisions on it.
 */
const BOT_PATTERN =
  /bot|crawler|spider|crawling|facebookexternalhit|whatsapp|telegram|slackbot|discordbot|twitterbot|linkedinbot|embedly|preview|headless|lighthouse|pingdom|curl|wget|python-requests|axios|node-fetch|undici|okhttp|go-http-client|java|^node$|\bnode\b/i

/**
 * Increments the view count for a published listing.
 *
 * Deliberately a POST from the browser rather than an increment during page
 * render. Rendering-time counting breaks the moment the page is cached or
 * statically revalidated (the counter silently freezes), and React's
 * double-render in development counts every visit twice.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params
  const userAgent = request.headers.get('user-agent') ?? ''

  /**
   * Report success either way: the client doesn't need to know it was filtered,
   * and a 4xx here would show up as a console error on a legitimate page view.
   *
   * A very short user-agent is also rejected. Real browsers send long strings;
   * an absent or 1-word agent means a script, and server-side HTTP clients were
   * being counted as buyers until this was tightened.
   */
  if (userAgent.length < 16 || BOT_PATTERN.test(userAgent)) {
    return Response.json({ counted: false }, { headers: { 'cache-control': 'no-store' } })
  }

  const updated = await db
    .update(listings)
    .set({ viewCount: sql`${listings.viewCount} + 1` })
    .where(and(eq(listings.slug, slug), eq(listings.status, 'published')))
    .returning({ viewCount: listings.viewCount })

  if (updated.length === 0) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  return Response.json(
    { counted: true, viewCount: updated[0].viewCount },
    { headers: { 'cache-control': 'no-store' } },
  )
}
