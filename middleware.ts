import { NextResponse, type NextRequest } from 'next/server'

// Imported from constants, not session: session.ts uses node:crypto, which the
// Edge runtime cannot load.
import { SESSION_COOKIE } from '@/lib/auth/constants'
import { envFlag } from '@/lib/env'

/**
 * Redirects signed-out visitors away from the dashboard.
 *
 * This is a UX convenience, NOT the security boundary. It only checks that a
 * cookie is present — it does not verify the signature, because middleware runs
 * on the edge runtime where Node's crypto isn't available. Real verification
 * happens in getCurrentAgent(), and every dashboard page and server action goes
 * through that. A forged cookie gets past this redirect and then resolves to no
 * agent, so it sees nothing.
 */
export function middleware(request: NextRequest) {
  /**
   * SKIP_AUTH is a development-only convenience; don't redirect past it.
   *
   * envFlag, not truthiness: the value is a string, so `SKIP_AUTH="false"` is
   * truthy and an earlier version of this check silently disabled the redirect
   * whenever the variable was set to anything at all.
   */
  if (process.env.NODE_ENV === 'development' && envFlag(process.env.SKIP_AUTH)) {
    return NextResponse.next()
  }

  if (request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next()
  }

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('from', request.nextUrl.pathname)

  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
