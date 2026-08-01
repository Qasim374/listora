import { sql } from 'drizzle-orm'
import {
  boolean,
  doublePrecision,
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
  // Shown to buyers on the public listing page. Nullable: an agent may prefer
  // to be contacted by email only.
  phone: text('phone'),
  /**
   * scrypt hash — see lib/auth/password.ts for the format.
   * Nullable so the dev-seeded agent can exist before a password is set.
   */
  passwordHash: text('password_hash'),

  // --- public-facing identity, shown on every listing this agent owns
  /** Blob URL. Buyers trust a face far more than a name alone. */
  headshotUrl: text('headshot_url'),
  brokerageName: text('brokerage_name'),
  brokerageLogoUrl: text('brokerage_logo_url'),
  /** Registration number. Required by law to display in many markets. */
  licenseNumber: text('license_number'),
  /** Default market for this agent's new listings. See lib/markets.ts. */
  market: text('market').notNull().default('us'),
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
  /**
   * Interior living area, in the unit of this listing's market — square feet for
   * US/UK, m² for Sweden. The column name is historical; formatArea() renders it
   * with the right suffix rather than assuming one.
   */
  sqft: integer('sqft'),

  /**
   * Which market's currency, units and mortgage rules this listing uses.
   *
   * Stored per listing, not just per agent: an agent who changes country must not
   * cause every past listing's price to silently relabel into another currency.
   */
  market: text('market').notNull().default('us'),

  // See PROPERTY_TYPE_LABELS in lib/markets.ts for the full set
  propertyType: text('property_type'),
  yearBuilt: integer('year_built'),
  /** Plot/land area, same unit as sqft. Distinct from interior living area. */
  lotSize: integer('lot_size'),
  /**
   * Recurring building charge: HOA fee in the US, service charge in the UK,
   * avgift in Sweden. A low asking price with a high monthly charge is a
   * materially different deal, and buyers compare on it directly everywhere.
   */
  monthlyFee: integer('monthly_fee'),

  /** Agent-entered amenities: "Balcony", "Fireplace", "Dishwasher", ... */
  features: jsonb('features').$type<string[]>(),

  /** YouTube or Vimeo link. Stored as given; converted to an embed at render. */
  videoUrl: text('video_url'),

  /**
   * Exact pin position, set by the agent dragging a marker.
   *
   * doublePrecision rather than numeric: these are read on every listing view
   * and never summed, so float accuracy is fine — and ~7 decimal places is
   * roughly 1cm, far beyond what a dragged pin conveys.
   *
   * Nullable because the pin is optional. A listing with no coordinates shows no
   * map rather than guessing a position from the address text.
   */
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),

  rawDescription: text('raw_description').notNull(),

  // AI-generated, agent-editable
  aiHeadline: text('ai_headline'),
  aiDescription: text('ai_description'),
  aiHighlights: jsonb('ai_highlights').$type<string[]>(),

  /**
   * PUBLICATION state: has the agent made the page live? 'draft' | 'published'.
   *
   * Deliberately separate from saleStatus below. The two are independent — a
   * listing can be published and pending, or published and sold — and folding
   * them into one column would mean marking something Sold silently took the
   * page offline.
   */
  status: text('status').notNull().default('draft'),

  /** SALE state, shown as the badge to buyers. See lib/sale-status.ts. */
  saleStatus: text('sale_status').notNull().default('for-sale'),
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
    /**
     * Floor plans are stored here rather than in their own table — same upload
     * path, same blob cleanup. They're excluded from the photo carousel and
     * shown in their own section, because a diagram between two room photos
     * reads as a mistake.
     */
    isFloorPlan: boolean('is_floor_plan').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('listing_images_one_cover_per_listing')
      .on(table.listingId)
      .where(sql`${table.isCover}`),
  ],
)

/**
 * Buyer enquiries from the public listing page.
 *
 * agentId is denormalised alongside listingId so the dashboard can list an
 * agent's leads without joining through listings — and so a lead survives as a
 * record even though deleting a listing cascades it away. (If leads should
 * outlive their listing, change that FK to `set null` and keep the address.)
 */
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id')
    .notNull()
    .references(() => listings.id, { onDelete: 'cascade' }),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  message: text('message').notNull(),

  /** Cleared when the agent opens the lead, so new ones can be counted. */
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Single-use password reset tokens.
 *
 * Only a SHA-256 hash of the token is stored, never the token itself. A leaked
 * database dump therefore cannot be used to reset anyone's password — the same
 * reason we don't store passwords in plain text.
 */
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** SHA-256 of the token that was emailed, hex-encoded. */
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  /** Set the moment it is redeemed, so a link cannot be replayed. */
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect

export type Lead = typeof leads.$inferSelect
export type NewLead = typeof leads.$inferInsert

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Listing = typeof listings.$inferSelect
export type NewListing = typeof listings.$inferInsert
export type ListingImage = typeof listingImages.$inferSelect
export type NewListingImage = typeof listingImages.$inferInsert
