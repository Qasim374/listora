import { config } from 'dotenv'

config({ path: '.env.local' })

/* eslint-disable no-console */

/**
 * Inserts one published demo listing so the dashboard and public listing page
 * have something to render before the upload flow exists.
 *
 * The copy below is hand-written placeholder text, NOT AI output — it exists to
 * exercise the render path. Remove the row any time with:
 *
 *   npm run db:demo -- --remove
 */
const DEMO_SLUG_PREFIX = 'demo-'

async function main() {
  const remove = process.argv.includes('--remove')

  const { eq, like } = await import('drizzle-orm')
  const { db } = await import('./index')
  const { listingImages, listings, users } = await import('./schema')

  const agentId = process.env.DEV_AGENT_ID

  if (!agentId) {
    throw new Error('DEV_AGENT_ID is not set in .env.local. Run `npm run db:seed` first.')
  }

  const agent = await db.query.users.findFirst({ where: eq(users.id, agentId) })

  if (!agent) {
    throw new Error(`No user with id ${agentId}. Run \`npm run db:seed\`.`)
  }

  if (remove) {
    // listing_images rows cascade on delete
    const deleted = await db
      .delete(listings)
      .where(like(listings.slug, `${DEMO_SLUG_PREFIX}%`))
      .returning({ slug: listings.slug })

    console.log(`\nRemoved ${deleted.length} demo listing(s).\n`)
    return
  }

  const [listing] = await db
    .insert(listings)
    .values({
      agentId,
      slug: `${DEMO_SLUG_PREFIX}storgatan-14`,
      address: 'Storgatan 14, 114 55 Stockholm',
      price: 7_450_000,
      beds: 3,
      baths: '1.5',
      sqft: 98,
      rawDescription:
        '3 rooms, top floor, corner apartment. Renovated kitchen 2021. Balcony faces south-west. Building from 1928, lift installed 2019. Close to Karlaplan metro.',
      aiHeadline: 'A top-floor corner apartment where the afternoon light lasts until dinner',
      aiDescription: `Set on the top floor of a 1928 building on Storgatan, this three-room corner apartment collects light from two directions — morning in the kitchen, late afternoon across the living room and out onto the south-west balcony.

The kitchen was rebuilt in 2021 and handles real cooking: full-height cabinetry, room for a proper table, and sightlines that keep you in the conversation. Ninety-eight square metres are laid out so the bedrooms sit away from the entrance, which makes the apartment quieter than its floor plan suggests.

A lift was added in 2019, and Karlaplan metro is a short walk away. Practical details handled, so the apartment can be judged on how it feels to live in.`,
      aiHighlights: [
        'Top-floor corner position with dual-aspect light',
        'Kitchen fully rebuilt in 2021',
        'South-west facing balcony',
        'Lift installed 2019 in a 1928 building',
        'Walking distance to Karlaplan metro',
      ],
      status: 'published',
    })
    .returning()

  await db.insert(listingImages).values([
    {
      listingId: listing.id,
      url: 'https://placehold.co/1600x900/0F3D35/F5F1EA.png?text=Living+room',
      sortOrder: 0,
      isCover: true,
    },
    {
      listingId: listing.id,
      url: 'https://placehold.co/1600x900/155448/F5F1EA.png?text=Kitchen',
      sortOrder: 1,
    },
    {
      listingId: listing.id,
      url: 'https://placehold.co/1600x900/1F6B5C/F5F1EA.png?text=Balcony',
      sortOrder: 2,
    },
  ])

  console.log('\nCreated demo listing:')
  console.log(`  http://localhost:3000/listing/${listing.slug}\n`)
  console.log('Remove it with: npm run db:demo -- --remove\n')
}

// Set exitCode rather than calling process.exit(): forcing exit while the HTTP
// driver's keep-alive sockets are mid-close trips a libuv assertion on Windows
// and reports failure for a script that actually succeeded.
main().catch((error) => {
  console.error('\nDemo seed failed:\n', error)
  process.exitCode = 1
})
