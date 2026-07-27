import Link from 'next/link'

import { getCurrentAgent } from '@/lib/auth/current-agent'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const agent = await getCurrentAgent()

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
            </nav>
          </div>

          {agent ? (
            <div className="text-right text-sm">
              <div className="font-medium text-ink">{agent.name}</div>
              <div className="text-ink-muted">{agent.email}</div>
            </div>
          ) : null}
        </div>
      </header>

      {process.env.SKIP_AUTH === 'true' ? (
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
