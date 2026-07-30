import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { users, type User } from '@/lib/db/schema'
import { envFlag } from '@/lib/env'

import { getSessionAgentId } from './session'

/**
 * The single place the app asks "who is the logged-in agent?".
 *
 * Every page, query and server action goes through here rather than reading a
 * cookie directly, which is what made swapping the dev stub for real sessions a
 * change to this one file.
 *
 * SKIP_AUTH is honoured ONLY in development. In production the value is ignored
 * entirely rather than throwing — a deployed app always uses real sessions, so
 * there is no flag to get wrong and no escape hatch to leave switched on.
 */
export async function getCurrentAgent(): Promise<User | null> {
  if (process.env.NODE_ENV === 'development' && envFlag(process.env.SKIP_AUTH)) {
    const devAgentId = process.env.DEV_AGENT_ID

    if (!devAgentId) {
      throw new Error(
        'SKIP_AUTH=true but DEV_AGENT_ID is not set. Run `npm run db:seed` and copy the printed id into .env.local.',
      )
    }

    const agent = await db.query.users.findFirst({ where: eq(users.id, devAgentId) })

    if (!agent) {
      throw new Error(
        `DEV_AGENT_ID ${devAgentId} was not found in the database. Run \`npm run db:seed\`.`,
      )
    }

    return agent
  }

  const agentId = await getSessionAgentId()

  if (!agentId) return null

  const agent = await db.query.users.findFirst({ where: eq(users.id, agentId) })

  // A valid token for a deleted account resolves to null rather than throwing,
  // so the caller simply treats it as signed out.
  return agent ?? null
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
