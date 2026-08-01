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
  const { hashPassword } = await import('../auth/password')
  const { db } = await import('./index')
  const { users } = await import('./schema')

  const email = process.env.DEV_AGENT_EMAIL ?? 'dev@listora.se'
  // Dev-only credential so you can exercise the real login flow locally.
  const devPassword = process.env.DEV_AGENT_PASSWORD ?? 'listora-dev-password'

  // Placeholder contact number so the public page has something to show.
  const phone = process.env.DEV_AGENT_PHONE ?? '+46 70 123 45 67'

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) })

  if (existing) {
    // Backfill columns added to the schema after this row was created
    const patch: {
      phone?: string
      passwordHash?: string
      brokerageName?: string
      licenseNumber?: string
    } = {}

    if (!existing.phone) patch.phone = phone
    if (!existing.passwordHash) patch.passwordHash = await hashPassword(devPassword)
    if (!existing.brokerageName) patch.brokerageName = 'Listora Fastighetsbyrå'
    if (!existing.licenseNumber) patch.licenseNumber = 'SE-2026-00123'

    if (Object.keys(patch).length > 0) {
      await db.update(users).set(patch).where(eq(users.id, existing.id))
      console.log(`\nDev agent already exists — backfilled: ${Object.keys(patch).join(', ')}.`)
    } else {
      console.log('\nDev agent already exists.')
    }

    console.log(`  DEV_AGENT_ID=${existing.id}`)
    console.log(`  sign in with: ${email} / ${devPassword}\n`)
    return
  }

  const [created] = await db
    .insert(users)
    .values({
      name: process.env.DEV_AGENT_NAME ?? 'Dev Agent',
      email,
      phone,
      passwordHash: await hashPassword(devPassword),
      brokerageName: 'Listora Fastighetsbyrå',
      licenseNumber: 'SE-2026-00123',
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
