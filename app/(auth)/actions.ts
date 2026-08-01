'use server'

import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { consumeResetToken, createResetToken } from '@/lib/auth/reset-tokens'
import { clearSessionCookie, setSessionCookie } from '@/lib/auth/session'
import { sendEmail } from '@/lib/email'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

export type AuthResult = { ok: false; error: string; fieldErrors?: Record<string, string> }

const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address').max(200)

const signUpSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(120),
  email: emailSchema,
  // 10 rather than 8: length is the only property that reliably resists
  // brute force, and composition rules mostly produce "Password1!".
  password: z.string().min(10, 'Use at least 10 characters').max(200),
})

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password').max(200),
})

function collectFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {}

  for (const issue of error.issues) {
    const key = issue.path.join('.')
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
  }

  return fieldErrors
}

export async function signUp(raw: unknown): Promise<AuthResult> {
  const parsed = signUpSchema.safeParse(raw)

  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: collectFieldErrors(parsed.error),
    }
  }

  const { name, email, password } = parsed.data

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) })

  if (existing) {
    return {
      ok: false,
      error: 'An account with that email already exists. Try signing in instead.',
      fieldErrors: { email: 'Already registered' },
    }
  }

  let agentId: string

  try {
    const [created] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash: await hashPassword(password),
        subscriptionTier: 'free',
      })
      .returning({ id: users.id })

    agentId = created.id
  } catch (error) {
    console.error('Sign up failed', error)
    return { ok: false, error: 'Could not create the account. Please try again.' }
  }

  await setSessionCookie(agentId)

  // Outside the try block: redirect() signals by throwing.
  redirect('/dashboard')
}

export async function signIn(raw: unknown): Promise<AuthResult> {
  const parsed = signInSchema.safeParse(raw)

  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: collectFieldErrors(parsed.error),
    }
  }

  const { email, password } = parsed.data
  const agent = await db.query.users.findFirst({ where: eq(users.email, email) })

  /**
   * One message for "no such email" and "wrong password", deliberately.
   * Distinguishing them turns the login form into an account-enumeration oracle:
   * anyone could discover which of their competitors' emails are registered.
   *
   * The hash is still verified against a dummy when the account doesn't exist,
   * so the response time doesn't reveal the answer either.
   */
  const failure: AuthResult = { ok: false, error: 'Email or password is incorrect.' }

  if (!agent?.passwordHash) {
    await verifyPassword(password, `scrypt$16384$8$1$${'00'.repeat(16)}$${'00'.repeat(64)}`)
    return failure
  }

  if (!(await verifyPassword(password, agent.passwordHash))) {
    return failure
  }

  await setSessionCookie(agent.id)
  redirect('/dashboard')
}

export async function signOut(): Promise<void> {
  await clearSessionCookie()
  redirect('/login')
}

/**
 * Starts a password reset.
 *
 * Always reports success, even for an address that has no account. Saying "no
 * such user" would turn this form into an account-enumeration oracle — anyone
 * could discover which agents are registered. The cost is that a typo looks like
 * it worked, which the confirmation copy accounts for.
 */
export async function requestPasswordReset(raw: unknown): Promise<AuthResult | { ok: true }> {
  const parsed = z.object({ email: emailSchema }).safeParse(raw)

  if (!parsed.success) {
    return { ok: false, error: 'Enter a valid email address.', fieldErrors: { email: 'Invalid' } }
  }

  const agent = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) })

  if (agent) {
    const token = await createResetToken(agent.id)
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const link = `${base}/reset-password?token=${encodeURIComponent(token)}`

    await sendEmail({
      to: agent.email,
      subject: 'Reset your Listora password',
      text: `Hello ${agent.name},

Someone asked to reset the password for your Listora account. If that was you, open the link below within the next hour:

${link}

If it wasn't you, ignore this email — your password has not changed and the link will expire on its own.

Listora`,
    })
  }

  return { ok: true }
}

/** Sets a new password from a valid reset token and signs the agent in. */
export async function resetPassword(raw: unknown): Promise<AuthResult> {
  const parsed = z
    .object({
      token: z.string().min(10, 'This reset link is incomplete'),
      password: z.string().min(10, 'Use at least 10 characters').max(200),
    })
    .safeParse(raw)

  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: collectFieldErrors(parsed.error),
    }
  }

  // Consume first: if two requests race, only one can claim the token.
  const userId = await consumeResetToken(parsed.data.token)

  if (!userId) {
    return {
      ok: false,
      error: 'This reset link is no longer valid. Request a new one.',
    }
  }

  try {
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(parsed.data.password) })
      .where(eq(users.id, userId))
  } catch (error) {
    console.error('Password reset failed', error)
    return { ok: false, error: 'Could not update your password. Please try again.' }
  }

  await setSessionCookie(userId)
  redirect('/dashboard')
}
