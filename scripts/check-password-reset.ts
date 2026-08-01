import { config } from 'dotenv'

config({ path: '.env.local' })

/* eslint-disable no-console */

/**
 * Security properties of the password reset flow.
 *
 *   npm run check:reset
 */
async function main() {
  const { createHash } = await import('node:crypto')
  const { eq } = await import('drizzle-orm')
  const { hashPassword, verifyPassword } = await import('../lib/auth/password')
  const { checkResetToken, consumeResetToken, createResetToken } =
    await import('../lib/auth/reset-tokens')
  const { db } = await import('../lib/db')
  const { passwordResetTokens, users } = await import('../lib/db/schema')

  let failures = 0
  const check = (label: string, pass: boolean, detail = '') => {
    if (!pass) failures++
    console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`)
  }

  console.log('\nPassword reset\n')

  const email = 'reset-check@example.com'
  await db.delete(users).where(eq(users.email, email))

  const [agent] = await db
    .insert(users)
    .values({ name: 'Reset Check', email, passwordHash: await hashPassword('original-password') })
    .returning()

  // --- happy path
  const token = await createResetToken(agent.id)
  const valid = await checkResetToken(token)
  check('fresh token validates', valid.valid && valid.userId === agent.id)

  // --- the raw token must never be in the database
  const rows = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, agent.id))
  check(
    'raw token is NOT stored, only its hash',
    rows.every((row) => row.tokenHash !== token),
    'a database leak must not enable resets',
  )
  check(
    'stored hash matches sha256 of the token',
    rows.some((row) => row.tokenHash === createHash('sha256').update(token).digest('hex')),
  )

  // --- forged / wrong tokens
  check('garbage token rejected', !(await checkResetToken('not-a-real-token')).valid)
  check('empty token rejected', !(await checkResetToken(undefined)).valid)
  check(
    'token for another shape rejected',
    !(await checkResetToken(token.slice(0, -2) + 'zz')).valid,
    'one altered character must fail',
  )

  // --- single use
  const consumed = await consumeResetToken(token)
  check('token consumes once', consumed === agent.id)
  const replay = await consumeResetToken(token)
  check('same token cannot be replayed', replay === null, 'this is the important one')
  check('consumed token no longer validates', !(await checkResetToken(token)).valid)

  // --- requesting a new link retires the old one
  const first = await createResetToken(agent.id)
  const second = await createResetToken(agent.id)
  check('requesting a new link invalidates the previous', !(await checkResetToken(first)).valid)
  check('newest link still works', (await checkResetToken(second)).valid)

  // --- expiry
  const expired = await createResetToken(agent.id)
  await db
    .update(passwordResetTokens)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(passwordResetTokens.tokenHash, createHash('sha256').update(expired).digest('hex')))
  check('expired token rejected by check', !(await checkResetToken(expired)).valid)
  check('expired token rejected by consume', (await consumeResetToken(expired)) === null)

  // --- the password actually changes, and the old one stops working
  const fresh = await createResetToken(agent.id)
  const userId = await consumeResetToken(fresh)
  if (userId) {
    await db
      .update(users)
      .set({ passwordHash: await hashPassword('a-brand-new-password') })
      .where(eq(users.id, userId))
  }
  const after = await db.query.users.findFirst({ where: eq(users.id, agent.id) })
  check('new password works', await verifyPassword('a-brand-new-password', after!.passwordHash!))
  check(
    'old password no longer works',
    !(await verifyPassword('original-password', after!.passwordHash!)),
  )

  await db.delete(users).where(eq(users.id, agent.id))
  console.log(`\n  ${failures === 0 ? 'all checks passed' : `${failures} FAILED`}\n`)
  if (failures > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
