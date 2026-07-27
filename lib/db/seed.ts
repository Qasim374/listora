import { config } from 'dotenv'

config({ path: '.env.local' })

/* eslint-disable no-console */

/**
 * Creates the development agent that getCurrentAgent() resolves to while
 * SKIP_AUTH=true. Run once: `npm run db:seed`, then copy the printed id into
 * DEV_AGENT_ID in .env.local.
 *
 * Safe to re-run — it reuses the existing row if the email already exists.
 */
async function main() {
  // Imported lazily so dotenv has populated DATABASE_URL before lib/db loads.
  const { eq } = await import('drizzle-orm')
  const { db } = await import('./index')
  const { users } = await import('./schema')

  const email = process.env.DEV_AGENT_EMAIL ?? 'dev@listora.se'

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) })

  if (existing) {
    console.log('\nDev agent already exists.')
    console.log(`  DEV_AGENT_ID=${existing.id}\n`)
    return
  }

  const [created] = await db
    .insert(users)
    .values({
      name: process.env.DEV_AGENT_NAME ?? 'Dev Agent',
      email,
      subscriptionTier: 'pro', // generous quota while developing
    })
    .returning()

  console.log('\nCreated dev agent. Add this line to .env.local:\n')
  console.log(`  DEV_AGENT_ID=${created.id}\n`)
}

// See the note in demo.ts — process.exit() during socket teardown trips a
// libuv assertion on Windows and masks success as failure.
main().catch((error) => {
  console.error('\nSeed failed:\n', error)
  process.exitCode = 1
})
