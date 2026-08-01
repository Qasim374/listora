import Link from 'next/link'
import { redirect } from 'next/navigation'

import { and, count, eq, isNull } from 'drizzle-orm'

import { SignOutButton } from '@/components/sign-out-button'
import { getCurrentAgent } from '@/lib/auth/current-agent'
import { db } from '@/lib/db'
import { leads } from '@/lib/db/schema'
import { envFlag } from '@/lib/env'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const agent = await getCurrentAgent()

  /**
   * The real gate for the whole dashboard.
   *
   * Middleware only checks that a cookie exists — it can't verify the signature
   * on the edge runtime. So an expired or forged cookie gets past middleware and
   * lands here, where the session has actually been checked. Redirecting rather
   * than rendering a "not signed in" panel matters because sessions expire after
   * 30 days: the normal case is a real agent who simply needs to log in again.
   */
  if (!agent) redirect('/login')

  // Unread count for the nav badge — the whole point of capturing leads is that
  // the agent notices them.
  const [unread] = await db
    .select({ value: count() })
    .from(leads)
    .where(and(eq(leads.agentId, agent.id), isNull(leads.readAt)))

  const unreadLeads = unread?.value ?? 0

  return (
    <div className="min-h-screen">
      <header className="border-b border-sand-200 bg-sand-50">
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-6">
            <Link href="/" className="font-display text-lg tracking-tight text-brand-800">
              Listora
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/dashboard" className="text-ink-soft hover:text-ink">
                Listings
              </Link>
              <Link
                href="/dashboard/leads"
                className="flex items-center gap-1.5 text-ink-soft hover:text-ink"
              >
                Enquiries
                {unreadLeads > 0 ? (
                  <span className="rounded-full bg-brand-600 px-1.5 text-[10px] font-medium text-sand-50">
                    {unreadLeads}
                  </span>
                ) : null}
              </Link>
              <Link href="/dashboard/settings" className="text-ink-soft hover:text-ink">
                Profile
              </Link>
            </nav>
          </div>

          {agent ? (
            <div className="flex items-center gap-4">
              <div className="text-right text-sm">
                <div className="font-medium text-ink">{agent.name}</div>
                <div className="text-ink-muted">{agent.email}</div>
              </div>
              <SignOutButton />
            </div>
          ) : null}
        </div>
      </header>

      {envFlag(process.env.SKIP_AUTH) ? (
        <div className="border-b border-accent-soft bg-accent-soft/25">
          <p className="mx-auto max-w-content px-6 py-2 text-xs text-ink-soft">
            Auth is disabled (<code className="font-mono">SKIP_AUTH=true</code>) — every request
            resolves to the seeded dev agent.
          </p>
        </div>
      ) : null}

      <main className="mx-auto max-w-content px-6 py-10">{children}</main>
    </div>
  )
}
