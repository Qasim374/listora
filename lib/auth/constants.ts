/**
 * Deliberately free of imports.
 *
 * middleware.ts needs the cookie name, and middleware runs on the Edge runtime
 * where `node:crypto` does not exist. Importing this from lib/auth/session.ts
 * would drag Node's crypto into the edge bundle and fail the build with
 * "Reading from node:crypto is not handled by plugins".
 */
export const SESSION_COOKIE = 'listora_session'
