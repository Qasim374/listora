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
 * Why this exists: an agent entered 3 bedrooms and 23 m². The AI faithfully
 * used both numbers and described a family home as "compact yet comfortable" —
 * copy that would embarrass an agent in front of a buyer. The model can't know
 * the number is wrong; it will always amplify bad input into confident prose.
 * So the check belongs here, before generation.
 *
 * These are WARNINGS, never hard errors. Unusual properties are real — a 12 m²
 * studio exists, and a 1 kr auction listing exists. The agent knows their
 * portfolio better than a threshold does, so we flag and let them decide.
 */
export function checkPlausibility(facts: Facts): PlausibilityWarning[] {
  const warnings: PlausibilityWarning[] = []
  const { price, beds, sqft } = facts

  if (typeof sqft === 'number' && sqft > 0) {
    if (sqft < 15) {
      warnings.push({
        field: 'sqft',
        message: `${sqft} m² is smaller than a single room. Check the number.`,
      })
    } else if (sqft > 2000) {
      warnings.push({
        field: 'sqft',
        message: `${sqft} m² is unusually large for a home. Check the number.`,
      })
    }

    // ~12 m² per bedroom is already tight once halls, kitchen and bathroom
    // are accounted for; below that the figure is near-certainly mistyped.
    if (typeof beds === 'number' && beds >= 2 && sqft < beds * 12) {
      warnings.push({
        field: 'sqft',
        message: `${beds} bedrooms in ${sqft} m² is not physically plausible. Did you mean a larger number?`,
      })
    }
  }

  if (typeof price === 'number' && price > 0 && price < 100_000) {
    warnings.push({
      field: 'price',
      message: `${new Intl.NumberFormat('sv-SE').format(price)} kr is low for a sale price. If this is monthly rent, say so in your notes.`,
    })
  }

  return warnings
}
