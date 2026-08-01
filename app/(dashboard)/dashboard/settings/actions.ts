'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { requireAgent } from '@/lib/auth/current-agent'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { agentProfileSchema } from '@/lib/validation'

export type ProfileResult =
  { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> }

export async function updateAgentProfile(raw: unknown): Promise<ProfileResult> {
  const agent = await requireAgent()

  const parsed = agentProfileSchema.safeParse(raw)

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}

    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.')
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
    }

    return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors }
  }

  try {
    await db.update(users).set(parsed.data).where(eq(users.id, agent.id))
  } catch (error) {
    console.error('Failed to update profile', error)
    return { ok: false, error: 'Could not save your profile. Please try again.' }
  }

  revalidatePath('/dashboard/settings')
  // Every published listing shows this agent's card, so their pages are stale now.
  revalidatePath('/dashboard')

  return { ok: true }
}
