'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { requireAgent } from '@/lib/auth/current-agent'
import { db } from '@/lib/db'
import { leads } from '@/lib/db/schema'

/** Clears the unread flag on this agent's enquiries. Scoped by agentId. */
export async function markLeadsRead(): Promise<void> {
  const agent = await requireAgent()

  await db
    .update(leads)
    .set({ readAt: new Date() })
    .where(and(eq(leads.agentId, agent.id), isNull(leads.readAt)))

  revalidatePath('/dashboard/leads')
  revalidatePath('/dashboard')
}
