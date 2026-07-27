import { checkPlausibility } from '../lib/plausibility'

/* eslint-disable no-console */

/**
 * Smoke checks for the typo detector. The 3-bed/23 m² row is the real case that
 * prompted this: it produced a published listing describing a family home as
 * "compact yet comfortable".
 *
 *   npm run check:plausibility
 */
const CASES: Array<{ label: string; facts: Parameters<typeof checkPlausibility>[0] }> = [
  { label: '3 beds, 23 m² (the real bug)', facts: { beds: 3, baths: 1.5, sqft: 23, price: 50_000 } },
  { label: 'sensible apartment', facts: { beds: 3, baths: 1.5, sqft: 98, price: 7_450_000 } },
  { label: 'genuine small studio', facts: { beds: 1, baths: 1, sqft: 28, price: 2_100_000 } },
  { label: 'nothing entered', facts: {} },
  { label: 'tiny area only', facts: { sqft: 8 } },
  { label: 'huge area', facts: { sqft: 4000 } },
  { label: 'low price only', facts: { price: 50_000 } },
  { label: 'large but plausible house', facts: { beds: 6, baths: 3, sqft: 240, price: 12_000_000 } },
]

console.log('\ncheckPlausibility:\n')

for (const { label, facts } of CASES) {
  const warnings = checkPlausibility(facts)

  if (warnings.length === 0) {
    console.log(`  ${label.padEnd(30)} clean`)
  } else {
    console.log(`  ${label.padEnd(30)} ${warnings.length} warning(s)`)
    for (const warning of warnings) {
      console.log(`  ${''.padEnd(30)}   [${warning.field}] ${warning.message}`)
    }
  }
}

console.log()
