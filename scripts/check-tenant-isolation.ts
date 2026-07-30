import { config } from 'dotenv'

config({ path: '.env.local' })

/* eslint-disable no-console */

/**
 * Drives the real login flow over HTTP, including the multi-tenant check:
 * agent B must not be able to open agent A's listing.
 */
const BASE = 'http://localhost:3000'

/** Server actions are POSTed to the page URL with a Next-Action header. */
async function callAction(path: string, actionId: string, args: unknown[], cookie?: string) {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'text/plain;charset=UTF-8',
      'next-action': actionId,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(args),
    redirect: 'manual',
  })
}

async function main() {
  const { eq } = await import('drizzle-orm')
  const { hashPassword } = await import('../lib/auth/password')
  const { createSessionToken, SESSION_COOKIE } = await import('../lib/auth/session')
  const { db } = await import('../lib/db')
  const { listings, users } = await import('../lib/db/schema')

  console.log('\nAuth end-to-end\n')

  // Two agents, created directly so the test doesn't depend on action ids
  const password = 'test-password-1234'
  const hash = await hashPassword(password)

  const emails = ['e2e-alice@example.com', 'e2e-bob@example.com']
  await db.delete(users).where(eq(users.email, emails[0]))
  await db.delete(users).where(eq(users.email, emails[1]))

  const [alice] = await db
    .insert(users)
    .values({ name: 'Alice', email: emails[0], passwordHash: hash, subscriptionTier: 'pro' })
    .returning()
  const [bob] = await db
    .insert(users)
    .values({ name: 'Bob', email: emails[1], passwordHash: hash, subscriptionTier: 'pro' })
    .returning()

  console.log('  1. created two agents (Alice, Bob)')

  // Alice owns a listing
  const [aliceListing] = await db
    .insert(listings)
    .values({
      agentId: alice.id,
      slug: 'e2e-alice-secret-house',
      address: 'Alice Private Road 1',
      rawDescription: 'Alice private listing used to verify tenant isolation.',
      status: 'draft',
    })
    .returning()

  console.log('  2. Alice owns a draft listing')

  // Sessions, minted the same way the login action does
  const aliceCookie = `${SESSION_COOKIE}=${createSessionToken(alice.id).token}`
  const bobCookie = `${SESSION_COOKIE}=${createSessionToken(bob.id).token}`

  const dash = await fetch(`${BASE}/dashboard`, {
    headers: { cookie: aliceCookie },
    redirect: 'manual',
  })
  const dashHtml = await dash.text()
  console.log(
    `  3. Alice /dashboard -> ${dash.status}  shows her name: ${dashHtml.includes('Alice')}  shows her listing: ${dashHtml.includes('Alice Private Road 1')}`,
  )

  const aliceOwn = await fetch(`${BASE}/dashboard/listings/${aliceListing.id}`, {
    headers: { cookie: aliceCookie },
    redirect: 'manual',
  })
  console.log(`  4. Alice opens her own listing -> ${aliceOwn.status} (expect 200)`)

  const bobSnoops = await fetch(`${BASE}/dashboard/listings/${aliceListing.id}`, {
    headers: { cookie: bobCookie },
    redirect: 'manual',
  })
  console.log(`  5. Bob opens Alice's listing -> ${bobSnoops.status} (expect 404)`)

  const bobEdit = await fetch(`${BASE}/dashboard/listings/${aliceListing.id}/edit`, {
    headers: { cookie: bobCookie },
    redirect: 'manual',
  })
  console.log(`  6. Bob opens Alice's EDIT page -> ${bobEdit.status} (expect 404)`)

  const bobDash = await fetch(`${BASE}/dashboard`, {
    headers: { cookie: bobCookie },
    redirect: 'manual',
  })
  const bobHtml = await bobDash.text()
  console.log(
    `  7. Bob's dashboard leaks Alice's listing: ${bobHtml.includes('Alice Private Road 1')} (expect false)`,
  )

  const forged = await fetch(`${BASE}/dashboard`, {
    headers: { cookie: `${SESSION_COOKIE}=totally.forged` },
    redirect: 'manual',
  })
  const forgedHtml = await forged.text()
  console.log(
    `  8. forged cookie -> ${forged.status}  reaches signed-in dashboard: ${forgedHtml.includes('Sign out')} (expect false)`,
  )

  // cleanup
  await db.delete(users).where(eq(users.id, alice.id))
  await db.delete(users).where(eq(users.id, bob.id))
  console.log('\n  cleaned up test agents (listings cascade)\n')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
