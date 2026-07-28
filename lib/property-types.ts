export const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'holiday-home', label: 'Holiday home' },
  { value: 'plot', label: 'Plot / land' },
  { value: 'other', label: 'Other' },
] as const

export type PropertyTypeValue = (typeof PROPERTY_TYPES)[number]['value']

export const PROPERTY_TYPE_VALUES = PROPERTY_TYPES.map((type) => type.value)

/** Falls back to the raw stored string so old rows never render as blank. */
export function propertyTypeLabel(value: string | null): string | null {
  if (!value) return null
  return PROPERTY_TYPES.find((type) => type.value === value)?.label ?? value
}
