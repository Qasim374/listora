import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

import { SESSION_COOKIE } from './constants'

export { SESSION_COOKIE }

const SESSION_DAYS = 30
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000

type SessionPayload = {
  /** Agent id */
  sub: string
  /** Expiry, epoch ms */
  exp: number
}

function secret(): string {
  const value = process.env.AUTH_SECRET

  if (!value || value.length < 32) {
    throw new Error(
      'AUTH_SECRET is missing or too short (needs 32+ characters). Generate one with: openssl rand -base64 32',
    )
  }

  return value
}

const b64url = (input: Buffer | string) => Buffer.from(input).toString('base64url')

function sign(data: string): string {
  return createHmac('sha256', secret()).update(data).digest('base64url')
}

/**
 * Stateless signed session token: `base64url(payload).signature`.
 *
 * No sessions table, so nothing to look up on every request — which matters on
 * serverless where each request may be a cold start. The tradeoff is that a
 * token stays valid until it expires; rotating AUTH_SECRET invalidates all of
 * them at once, which is the intended emergency lever.
 */
export function createSessionToken(agentId: string): { token: string; expiresAt: Date } {
  const payload: SessionPayload = { sub: agentId, exp: Date.now() + SESSION_MS }
  const body = b64url(JSON.stringify(payload))

  return { token: `${body}.${sign(body)}`, expiresAt: new Date(payload.exp) }
}

/** Returns the agent id, or null if the token is malformed, forged or expired. */
export function readSessionToken(token: string | undefined): string | null {
  if (!token) return null

  const [body, signature] = token.split('.')
  if (!body || !signature) return null

  const expected = sign(body)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)

  // Constant-time compare so a forged signature can't be guessed byte by byte
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload

    if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return null
    if (payload.exp < Date.now()) return null

    return payload.sub
  } catch {
    return null
  }
}

export async function setSessionCookie(agentId: string): Promise<void> {
  const { token, expiresAt } = createSessionToken(agentId)
  const store = await cookies()

  store.set(SESSION_COOKIE, token, {
    httpOnly: true, // not readable by JavaScript, so XSS can't steal it
    sameSite: 'lax', // sent on top-level navigation, blocked on cross-site POST
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function getSessionAgentId(): Promise<string | null> {
  const store = await cookies()
  return readSessionToken(store.get(SESSION_COOKIE)?.value)
}
