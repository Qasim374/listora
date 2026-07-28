/**
 * Subscription plans as code rather than a database table.
 *
 * Plans change roughly never, and keeping them here means: the tier keys are
 * type-checked at every call site, there's no seeding step, and there's no way
 * for a DB row to disagree with what Stripe actually charges. The Stripe price
 * IDs come from env so staging and production can point at different products.
 */
export type PlanId = 'free' | 'starter' | 'pro'

export type Plan = {
  id: PlanId
  name: string
  /** Monthly price in SEK. 0 for the free tier. */
  price: number
  /** Max listings creatable per billing period. */
  listingLimit: number
  features: string[]
  /** Stripe price ID; null for the free tier, which has no checkout. */
  stripePriceId: string | null
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    listingLimit: 3,
    // The listing count is rendered from `listingLimit` on the pricing card, so
    // repeating it here would print it twice.
    features: ['AI-enhanced copy', 'Shareable listing pages', 'Photo galleries'],
    stripePriceId: null,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 299,
    listingLimit: 25,
    features: [
      'AI-enhanced copy',
      'Shareable listing pages',
      'Photo galleries',
      'View counts per listing',
    ],
    stripePriceId: process.env.STRIPE_PRICE_STARTER ?? null,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 799,
    listingLimit: 200,
    features: [
      'AI-enhanced copy',
      'Shareable listing pages',
      'Photo galleries',
      'View counts per listing',
      'Priority generation',
    ],
    stripePriceId: process.env.STRIPE_PRICE_PRO ?? null,
  },
}

export const PLAN_ORDER: PlanId[] = ['free', 'starter', 'pro']

/** Falls back to the free plan for an unrecognised tier string from the DB. */
export function getPlan(tier: string): Plan {
  return PLANS[tier as PlanId] ?? PLANS.free
}
