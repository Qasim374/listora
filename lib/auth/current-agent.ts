import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { users, type User } from '@/lib/db/schema'

/**
 * The single place the app asks "who is the logged-in agent?".
 *
 * Right now auth is skipped: with SKIP_AUTH=true we resolve to the seeded dev
 * agent (see lib/db/seed.ts). Every page, query and server action goes through
 * this function rather than reading a session directly, so adding real auth
 * later is a change to THIS FILE ONLY — no schema migration, no query rewrites.
 *
 * When NextAuth goes in, the else-branch below becomes:
 *
 *   const session = await auth()
 *   if (!session?.user?.email) return null
 *   return db.query.users.findFirst({ where: eq(users.email, session.user.email) }) ?? null
 *
 * ...and SKIP_AUTH flips to false. That's the whole migration.
 */
export async function getCurrentAgent(): Promise<User | null> {
  if (process.env.SKIP_AUTH === 'true') {
    const devAgentId = process.env.DEV_AGENT_ID

    if (!devAgentId) {
      throw new Error(
        'SKIP_AUTH=true but DEV_AGENT_ID is not set. Run `npm run db:seed` and copy the printed id into .env.local.',
      )
    }

    const agent = await db.query.users.findFirst({
      where: eq(users.id, devAgentId),
    })

    if (!agent) {
      throw new Error(
        `DEV_AGENT_ID ${devAgentId} was not found in the database. Run \`npm run db:seed\`.`,
      )
    }

    return agent
  }

  // Real auth not wired up yet — see step 3 of the build plan.
  return null
}

/**
 * Use in server components and actions that cannot proceed without an agent.
 * Throws rather than returning null so callers don't need null-checks everywhere.
 */
export async function requireAgent(): Promise<User> {
  const agent = await getCurrentAgent()

  if (!agent) {
    throw new Error('Not authenticated')
  }

  return agent
}
