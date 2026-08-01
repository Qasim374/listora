export const SALE_STATUSES = [
  { value: 'for-sale', label: 'For sale', tone: 'positive' },
  { value: 'pending', label: 'Pending', tone: 'caution' },
  { value: 'sold', label: 'Sold', tone: 'neutral' },
  { value: 'withdrawn', label: 'Withdrawn', tone: 'neutral' },
] as const

export type SaleStatusValue = (typeof SALE_STATUSES)[number]['value']

export const SALE_STATUS_VALUES = SALE_STATUSES.map((status) => status.value)

/** Falls back to "For sale" so an unknown stored value never renders blank. */
export function saleStatus(value: string | null) {
  return SALE_STATUSES.find((status) => status.value === value) ?? SALE_STATUSES[0]
}

/** Badge classes per tone. Sold and Withdrawn are deliberately muted. */
export function saleStatusClasses(value: string | null): string {
  switch (saleStatus(value).tone) {
    case 'positive':
      return 'bg-brand-100 text-brand-700'
    case 'caution':
      return 'bg-accent-soft/40 text-ink'
    default:
      return 'bg-sand-300 text-ink-soft'
  }
}
