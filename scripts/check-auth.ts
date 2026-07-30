import { config } from 'dotenv'

config({ path: '.env.local' })

/* eslint-disable no-console */

/**
 * Verifies the security properties of the auth layer, not just the happy path.
 *
 *   npm run check:auth
 */
async function main() {
  const { hashPassword, verifyPassword } = await import('../lib/auth/password')
  const { createSessionToken, readSessionToken } = await import('../lib/auth/session')

  let failures = 0
  const check = (label: string, pass: boolean, detail = '') => {
    if (!pass) failures++
    console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`)
  }

  console.log('\nPassword hashing\n')

  const hash = await hashPassword('correct horse battery staple')
  check('correct password verifies', await verifyPassword('correct horse battery staple', hash))
  check('wrong password rejected', !(await verifyPassword('wrong password entirely', hash)))
  check('near-miss rejected', !(await verifyPassword('correct horse battery stapl', hash)))
  check('empty password rejected', !(await verifyPassword('', hash)))
  check('hash format is scrypt', hash.startsWith('scrypt$16384$8$1$'))
  check(
    'salt differs between hashes',
    (await hashPassword('same')) !== (await hashPassword('same')),
    'same password must not produce the same hash',
  )
  check('garbage hash rejected, no throw', !(await verifyPassword('x', 'not-a-real-hash')))
  check('empty stored hash rejected', !(await verifyPassword('x', '')))

  console.log('\nSession tokens\n')

  const { token } = createSessionToken('agent-123')
  check('valid token reads back', readSessionToken(token) === 'agent-123')
  check('missing token rejected', readSessionToken(undefined) === null)
  check('garbage rejected', readSessionToken('nonsense') === null)

  // Tamper with the payload but keep the original signature
  const [body, signature] = token.split('.')
  const forgedBody = Buffer.from(
    JSON.stringify({ sub: 'someone-elses-id', exp: Date.now() + 60_000 }),
  ).toString('base64url')
  check(
    'forged payload rejected',
    readSessionToken(`${forgedBody}.${signature}`) === null,
    'signature must not validate a swapped payload',
  )
  check('stripped signature rejected', readSessionToken(body) === null)
  check('empty signature rejected', readSessionToken(`${body}.`) === null)

  // An expired but correctly signed token
  const expiredBody = Buffer.from(
    JSON.stringify({ sub: 'agent-123', exp: Date.now() - 1000 }),
  ).toString('base64url')
  const { createHmac } = await import('node:crypto')
  const expiredSig = createHmac('sha256', process.env.AUTH_SECRET!)
    .update(expiredBody)
    .digest('base64url')
  check(
    'expired token rejected',
    readSessionToken(`${expiredBody}.${expiredSig}`) === null,
    'correctly signed but past exp',
  )

  // A token signed with a different secret must not validate
  const otherSig = createHmac('sha256', 'a-completely-different-secret-value-here')
    .update(body)
    .digest('base64url')
  check('token from another secret rejected', readSessionToken(`${body}.${otherSig}`) === null)

  console.log(`\n  ${failures === 0 ? 'all checks passed' : `${failures} FAILED`}\n`)
  if (failures > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
