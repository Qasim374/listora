import { config } from 'dotenv'

config({ path: '.env.local' })

/* eslint-disable no-console */

/**
 * End-to-end check: draft → generate copy → publish → fetch public page.
 *
 * Replicates exactly what the server actions do (same lib/ai call, same DB
 * writes) without needing a browser, then confirms the generated copy actually
 * reaches the public page. Creates and then deletes one real listing.
 *
 * Requires `npm run dev` for step 5; the earlier steps work regardless.
 *
 * Worth re-running after ANY change to lib/ai/prompt.ts, and worth reading the
 * printed copy rather than only the pass/fail line: this is how the prompt-
 * example-leaked-as-fact bug was caught (a fabricated kitchen island), which no
 * assertion was looking for.
 */
async function main() {
  const { eq } = await import('drizzle-orm')
  const { generateListingCopy } = await import('../lib/ai')
  const { db } = await import('../lib/db')
  const { listings } = await import('../lib/db/schema')
  const { slugifyAddress } = await import('../lib/utils')

  const agentId = process.env.DEV_AGENT_ID
  if (!agentId) throw new Error('DEV_AGENT_ID missing')

  const step = (n: number, msg: string) => console.log(`  ${n}. ${msg}`)
  console.log('\nEnd-to-end check\n')

  // 1. draft (what the listing form does)
  const [draft] = await db
    .insert(listings)
    .values({
      agentId,
      slug: slugifyAddress('E2E Testgatan 9, Göteborg'),
      address: 'E2E Testgatan 9, 411 20 Göteborg',
      price: 3_950_000,
      beds: 2,
      baths: '1.0',
      sqft: 64,
      rawDescription:
        'Two rooms, second floor. Bay windows facing a courtyard. Original 1930s parquet. Shared laundry in basement. Five minutes walk to Linnéplatsen.',
      status: 'draft',
    })
    .returning()

  step(1, `draft created  slug=${draft.slug}`)

  // 2. generate (what generateCopy() does)
  const startedAt = Date.now()
  const copy = await generateListingCopy({
    address: draft.address,
    rawDescription: draft.rawDescription,
    price: draft.price,
    beds: draft.beds,
    baths: draft.baths === null ? null : Number(draft.baths),
    sqft: draft.sqft,
  })
  step(2, `copy generated in ${Date.now() - startedAt} ms`)

  await db
    .update(listings)
    .set({
      aiHeadline: copy.headline,
      aiDescription: copy.description,
      aiHighlights: copy.highlights,
    })
    .where(eq(listings.id, draft.id))
  step(3, 'copy saved to database')

  // 3. publish (what publishListing() does)
  await db.update(listings).set({ status: 'published' }).where(eq(listings.id, draft.id))
  step(4, 'published')

  // 4. does the public page actually show it?
  const url = `http://localhost:3000/listing/${draft.slug}`
  let verdict = 'could not reach dev server'

  try {
    const response = await fetch(url)
    const html = await response.text()
    const stripped = html.replace(/<!--.*?-->/g, '')

    const checks = {
      headline: stripped.includes(copy.headline),
      firstHighlight: stripped.includes(copy.highlights[0]),
      price: /3[\s  ]?950[\s  ]?000/.test(stripped),
    }

    verdict = `HTTP ${response.status} — ${Object.entries(checks)
      .map(([key, pass]) => `${key}:${pass ? 'ok' : 'MISSING'}`)
      .join(' ')}`
  } catch (error) {
    verdict = `fetch failed: ${error instanceof Error ? error.message : String(error)}`
  }

  step(5, `public page: ${verdict}`)

  console.log('\n--- generated copy ---')
  console.log(`HEADLINE: ${copy.headline}`)
  console.log(`\n${copy.description}\n`)
  copy.highlights.forEach((h) => console.log(`  • ${h}`))

  // cleanup
  await db.delete(listings).where(eq(listings.id, draft.id))
  console.log('\n  cleaned up test listing\n')
}

main().catch((error) => {
  console.error('\nE2E check failed:\n', error)
  process.exitCode = 1
})
