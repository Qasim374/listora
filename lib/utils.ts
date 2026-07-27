import { nanoid } from 'nanoid'

/**
 * Build a listing slug from its address.
 *
 * The random suffix matters: a slug of just the address means anyone can
 * enumerate a competitor's whole portfolio by guessing street names. Six
 * nanoid characters make the URL unguessable while keeping it readable and
 * sidestepping collisions on duplicate addresses.
 */
export function slugifyAddress(address: string): string {
  const base = address
    .toLowerCase()
    // Fold Swedish characters before NFD splits them into base + diacritic
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .normalize('NFD')
    // Strip any remaining combining diacritical marks
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  const stem = base.length > 0 ? base : 'listing'

  return `${stem}-${nanoid(6).toLowerCase()}`
}

/** Tiny className joiner. Avoids pulling in clsx/tailwind-merge for this. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/** 4 250 000 kr — Swedish formatting, no decimals. */
export function formatPrice(price: number | null): string {
  if (price === null) return 'Price on request'

  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(price)
}

export function formatSqft(sqft: number | null): string {
  if (sqft === null) return '—'
  return `${new Intl.NumberFormat('sv-SE').format(sqft)} m²`
}
