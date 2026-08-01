import { market, PROPERTY_TYPE_LABELS } from './markets'

/**
 * The property types offered for a given market.
 *
 * A US agent should see "Condo" and "Single-family home", not "Holiday home";
 * a UK agent expects "Semi-detached" and "Terraced". The stored value is the
 * shared key, so a listing keeps rendering correctly even if its market changes.
 */
export function propertyTypesFor(marketId: string | null | undefined) {
  return market(marketId).propertyTypes.map((value) => ({
    value,
    label: PROPERTY_TYPE_LABELS[value] ?? value,
  }))
}

/** Every known value, used for validation across all markets. */
export const PROPERTY_TYPE_VALUES = Object.keys(PROPERTY_TYPE_LABELS)

/** Falls back to the raw stored string so old rows never render as blank. */
export function propertyTypeLabel(value: string | null): string | null {
  if (!value) return null
  return PROPERTY_TYPE_LABELS[value] ?? value
}
