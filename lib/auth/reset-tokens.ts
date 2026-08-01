import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

import { and, eq, isNull } from 'drizzle-orm'

import { db } from '@/lib/db'
import { passwordResetTokens } from '@/lib/db/schema'

/** One hour. Long enough to find the email, short enough to limit exposure. */
const TTL_MS = 60 * 60 * 1000

/**
 * SHA-256, not scrypt.
 *
 * Slow hashing exists to defend low-entropy human passwords against brute force.
 * These tokens are 32 random bytes, so guessing one is already infeasible — and
 * a slow hash on every reset-link click would just be latency.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Creates a reset token, returning the raw value to email exactly once. */
export async function createResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url')

  // Invalidate any outstanding tokens: requesting a new link should retire the
  // old one, so a previously-sent email can't be used later.
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)))

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + TTL_MS),
  })

  return token
}

export type ResetTokenCheck = { valid: true; userId: string } | { valid: false; reason: string }

/** Verifies a token without consuming it — used to render the reset form. */
export async function checkResetToken(token: string | undefined): Promise<ResetTokenCheck> {
  if (!token) return { valid: false, reason: 'This reset link is incomplete.' }

  const row = await db.query.passwordResetTokens.findFirst({
    where: eq(passwordResetTokens.tokenHash, hashToken(token)),
  })

  if (!row) return { valid: false, reason: 'This reset link is not valid.' }
  if (row.usedAt !== null) return { valid: false, reason: 'This reset link has already been used.' }
  if (row.expiresAt.getTime() < Date.now()) {
    return { valid: false, reason: 'This reset link has expired. Request a new one.' }
  }

  return { valid: true, userId: row.userId }
}

/**
 * Consumes the token, returning the user id it belonged to.
 *
 * The update is conditional on `usedAt IS NULL`, so two simultaneous submissions
 * of the same link cannot both succeed — the database decides the winner rather
 * than a read-then-write race in application code.
 */
export async function consumeResetToken(token: string): Promise<string | null> {
  const hash = hashToken(token)

  const [claimed] = await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.tokenHash, hash), isNull(passwordResetTokens.usedAt)))
    .returning({ userId: passwordResetTokens.userId, expiresAt: passwordResetTokens.expiresAt })

  if (!claimed) return null
  if (claimed.expiresAt.getTime() < Date.now()) return null

  return claimed.userId
}

/** Exposed for tests: confirms hashing is deterministic and comparison is safe. */
export function tokensMatch(token: string, storedHash: string): boolean {
  const a = Buffer.from(hashToken(token))
  const b = Buffer.from(storedHash)
  return a.length === b.length && timingSafeEqual(a, b)
}
