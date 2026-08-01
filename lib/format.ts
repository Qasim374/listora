import { market, type Market } from './markets'

/**
 * Market-aware formatting.
 *
 * These replace the previous SEK/m²-hardcoded helpers. Every caller must pass the
 * listing's market, which is what stops a US listing rendering as kronor.
 */
export function formatPrice(amount: number | null, marketId: string | null | undefined): string {
  if (amount === null) return 'Price on request'

  const m = market(marketId)

  return new Intl.NumberFormat(m.locale, {
    style: 'currency',
    currency: m.currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Interior or plot area, in whichever unit this market uses. */
export function formatArea(value: number | null, marketId: string | null | undefined): string {
  if (value === null) return '—'

  const m = market(marketId)

  return `${new Intl.NumberFormat(m.locale).format(value)} ${m.areaSuffix}`
}

/** Plain number with the market's grouping — 7,450,000 vs 7 450 000. */
export function formatNumber(value: number, marketId: string | null | undefined): string {
  return new Intl.NumberFormat(market(marketId).locale).format(value)
}

export function formatDate(date: Date, marketId: string | null | undefined): string {
  return new Intl.DateTimeFormat(market(marketId).locale, { dateStyle: 'medium' }).format(date)
}

export function formatDateTime(date: Date, marketId: string | null | undefined): string {
  return new Intl.DateTimeFormat(market(marketId).locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

/** Price per unit area — buyers in every market compare on this. */
export function formatPricePerArea(
  price: number | null,
  area: number | null,
  marketId: string | null | undefined,
): string | null {
  if (price === null || area === null || area <= 0) return null

  const m: Market = market(marketId)
  return `${formatPrice(Math.round(price / area), marketId)} / ${m.areaSuffix}`
}
