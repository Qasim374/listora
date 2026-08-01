import { desc, eq } from 'drizzle-orm'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { requireAgent } from '@/lib/auth/current-agent'
import { db } from '@/lib/db'
import { leads, listings } from '@/lib/db/schema'
import { formatDateTime } from '@/lib/format'

import { markLeadsRead } from './actions'

export const metadata = { title: 'Enquiries' }
export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const agent = await requireAgent()

  const rows = await db
    .select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      phone: leads.phone,
      message: leads.message,
      createdAt: leads.createdAt,
      readAt: leads.readAt,
      listingSlug: listings.slug,
      listingAddress: listings.address,
      listingMarket: listings.market,
    })
    .from(leads)
    .innerJoin(listings, eq(leads.listingId, listings.id))
    .where(eq(leads.agentId, agent.id))
    .orderBy(desc(leads.createdAt))

  const unread = rows.filter((row) => row.readAt === null).length

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-brand-900">Enquiries</h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            {rows.length === 0
              ? 'Buyers who message you from a listing page appear here.'
              : `${rows.length} total${unread > 0 ? ` · ${unread} new` : ''}`}
          </p>
        </div>

        {unread > 0 ? (
          <form
            action={async () => {
              'use server'
              await markLeadsRead()
              redirect('/dashboard/leads')
            }}
          >
            <button type="submit" className="btn-secondary">
              Mark all as read
            </button>
          </form>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="card mt-8 text-center">
          <h2 className="font-display text-xl text-brand-900">No enquiries yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            Every published listing has a message form at the bottom. When a buyer sends one, their
            details land here.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {rows.map((lead) => (
            <li
              key={lead.id}
              className={
                lead.readAt === null
                  ? 'rounded-xl border-l-4 border-l-brand-500 border-y border-r border-sand-200 bg-sand-50 p-5'
                  : 'card'
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-medium text-ink">{lead.name}</h2>
                    {lead.readAt === null ? (
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-700">
                        New
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    {lead.listingAddress} · {formatDateTime(lead.createdAt, lead.listingMarket)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* mailto/tel so one tap replies from the agent's own client */}
                  {lead.email ? (
                    <a href={`mailto:${lead.email}`} className="btn-secondary">
                      {lead.email}
                    </a>
                  ) : null}
                  {lead.phone ? (
                    <a href={`tel:${lead.phone.replace(/\s+/g, '')}`} className="btn-secondary">
                      {lead.phone}
                    </a>
                  ) : null}
                </div>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                {lead.message}
              </p>

              <Link
                href={`/listing/${lead.listingSlug}`}
                target="_blank"
                className="mt-3 inline-block text-sm text-brand-600 hover:text-brand-700"
              >
                View the listing they enquired about →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
