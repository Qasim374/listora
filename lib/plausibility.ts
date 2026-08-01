import { formatNumber } from './format'
import { market } from './markets'

export type PlausibilityWarning = {
  field: 'price' | 'beds' | 'baths' | 'sqft'
  message: string
}

type Facts = {
  price?: number | null
  beds?: number | null
  baths?: number | null
  sqft?: number | null
}

/**
 * Catches property facts that are almost certainly typos.
 *
 * Why this exists: an agent entered 3 bedrooms and 23 m². The AI faithfully used
 * both numbers and described a family home as "compact yet comfortable" — copy
 * that would embarrass an agent in front of a buyer. The model can't know a
 * number is wrong; it will always amplify bad input into confident prose. So the
 * check belongs here, before generation.
 *
 * Thresholds come from the market, because they are unit-dependent: 1,500 is a
 * normal US home in square feet and an implausible mansion in square metres. An
 * earlier version hardcoded the metric bounds, which would have flagged almost
 * every US listing as "unusually large".
 *
 * These are WARNINGS, never hard errors. Unusual properties are real, and the
 * agent knows their portfolio better than a threshold does.
 */
export function checkPlausibility(facts: Facts, marketId?: string | null): PlausibilityWarning[] {
  const warnings: PlausibilityWarning[] = []
  const m = market(marketId)
  const { minArea, maxArea, areaPerBedroom, lowPrice } = m.plausibility
  const { price, beds, sqft } = facts

  if (typeof sqft === 'number' && sqft > 0) {
    if (sqft < minArea) {
      warnings.push({
        field: 'sqft',
        message: `${sqft} ${m.areaSuffix} is smaller than a single room. Check the number.`,
      })
    } else if (sqft > maxArea) {
      warnings.push({
        field: 'sqft',
        message: `${formatNumber(sqft, marketId)} ${m.areaSuffix} is unusually large for a home. Check the number.`,
      })
    }

    if (typeof beds === 'number' && beds >= 2 && sqft < beds * areaPerBedroom) {
      warnings.push({
        field: 'sqft',
        message: `${beds} bedrooms in ${formatNumber(sqft, marketId)} ${m.areaSuffix} is not physically plausible. Did you mean a larger number?`,
      })
    }
  }

  if (typeof price === 'number' && price > 0 && price < lowPrice) {
    warnings.push({
      field: 'price',
      message: `${formatNumber(price, marketId)} is low for a sale price. If this is monthly rent, say so in your notes.`,
    })
  }

  return warnings
}
