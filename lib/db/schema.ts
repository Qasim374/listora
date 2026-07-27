import { sql } from 'drizzle-orm'
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * Agents (our users). One row per real-estate agent account.
 *
 * Note on quotas: there is deliberately no `listings_used` counter here. A bare
 * counter has no notion of a billing period and never resets, so it drifts out
 * of sync with Stripe the first time someone renews. Instead we store the
 * period boundaries and COUNT(*) listings created inside the current period —
 * see lib/quota.ts. That value is always correct by construction.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  // Matches a key in lib/plans.ts — 'free' | 'starter' | 'pro'
  subscriptionTier: text('subscription_tier').notNull().default('free'),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  // Billing-period window, updated by the Stripe webhook. Null on free tier,
  // where we fall back to the account creation date.
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * A property listing. `rawDescription` is what the agent typed; the `ai*`
 * columns hold the generated copy, which the agent can edit before publishing.
 */
export const listings = pgTable('listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Slug carries a random suffix so listings can't be enumerated by guessing
  // addresses — see slugifyAddress() in lib/utils.ts.
  slug: text('slug').notNull().unique(),

  // Agent-supplied facts
  address: text('address').notNull(),
  price: integer('price'),
  beds: integer('beds'),
  // numeric so "1.5 baths" is representable
  baths: numeric('baths', { precision: 3, scale: 1 }),
  sqft: integer('sqft'),
  rawDescription: text('raw_description').notNull(),

  // AI-generated, agent-editable
  aiHeadline: text('ai_headline'),
  aiDescription: text('ai_description'),
  aiHighlights: jsonb('ai_highlights').$type<string[]>(),

  status: text('status').notNull().default('draft'), // 'draft' | 'published'
  viewCount: integer('view_count').notNull().default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Images belonging to a listing.
 *
 * `sortOrder` rather than `order` — ORDER is a reserved word in Postgres and
 * an unquoted column of that name breaks every query that touches it.
 *
 * The partial unique index enforces at most one cover image per listing at the
 * database level, so the flag can't drift into "two covers" through a partial
 * write or a concurrent update.
 */
export const listingImages = pgTable(
  'listing_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isCover: boolean('is_cover').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('listing_images_one_cover_per_listing')
      .on(table.listingId)
      .where(sql`${table.isCover}`),
  ],
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Listing = typeof listings.$inferSelect
export type NewListing = typeof listings.$inferInsert
export type ListingImage = typeof listingImages.$inferSelect
export type NewListingImage = typeof listingImages.$inferInsert
