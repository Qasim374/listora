import { and, count, eq, gte } from 'drizzle-orm'

import { db } from '@/lib/db'
import { listings, type User } from '@/lib/db/schema'
import { getPlan } from '@/lib/plans'

export type QuotaStatus = {
  used: number
  limit: number
  remaining: number
  canCreate: boolean
  periodStart: Date
}

/**
 * How many listings has this agent created in the current billing period?
 *
 * Counted live rather than read from a stored counter, so it stays correct
 * across renewals, plan changes, refunds and deletions with no reset job.
 * Paid tiers use the Stripe period start; free tier counts from signup.
 */
export async function getQuotaStatus(agent: User): Promise<QuotaStatus> {
  const plan = getPlan(agent.subscriptionTier)
  const periodStart = agent.currentPeriodStart ?? agent.createdAt

  const [row] = await db
    .select({ value: count() })
    .from(listings)
    .where(and(eq(listings.agentId, agent.id), gte(listings.createdAt, periodStart)))

  const used = row?.value ?? 0
  const remaining = Math.max(0, plan.listingLimit - used)

  return {
    used,
    limit: plan.listingLimit,
    remaining,
    canCreate: used < plan.listingLimit,
    periodStart,
  }
}
