import { formatArea, formatPrice, formatPricePerArea } from '../lib/format'
import { MARKET_IDS, market } from '../lib/markets'
import { calculateMortgage } from '../lib/mortgage'
import { checkPlausibility } from '../lib/plausibility'
import { propertyTypesFor } from '../lib/property-types'

/* eslint-disable no-console */

let failures = 0
const check = (label: string, pass: boolean, detail = '') => {
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`)
}

console.log('\nFormatting per market\n')
for (const id of MARKET_IDS) {
  const m = market(id)
  console.log(
    `  ${m.label.padEnd(16)} ${formatPrice(329000, id).padEnd(14)} ${formatArea(2632, id).padEnd(12)} ${formatPricePerArea(329000, 2632, id)}`,
  )
}

console.log('\nCurrency symbols are actually different\n')
check('US uses $', formatPrice(329000, 'us').includes('$'))
check('UK uses £', formatPrice(329000, 'uk').includes('£'))
check('SE uses kr', formatPrice(329000, 'se').includes('kr'))
check('US groups with commas', formatPrice(1234567, 'us').includes(','), formatPrice(1234567, 'us'))
check('US area says sq ft', formatArea(2632, 'us').includes('sq ft'))
check('SE area says m²', formatArea(98, 'se').includes('m²'))
check('unknown market falls back, no crash', formatPrice(100, 'zz').length > 0)
check('null market falls back', formatPrice(100, null).length > 0)

console.log('\nMortgage: same house, three markets ($400k / 5% / 20% down)\n')
for (const id of MARKET_IDS) {
  const result = calculateMortgage({
    marketId: id,
    price: 400_000,
    downPercent: 20,
    interestPercent: 5,
    monthlyFee: 200,
  })

  console.log(`  ${market(id).label}`)
  console.log(`    loan ${formatPrice(result.loan, id)}`)
  for (const row of result.rows) {
    console.log(`    ${row.label.padEnd(34)} ${formatPrice(Math.round(row.monthly), id)}`)
  }
  console.log(`    ${'TOTAL'.padEnd(34)} ${formatPrice(Math.round(result.totalMonthly), id)}`)
  console.log()
}

// A 30-year $320,000 loan at 5% is a well-known ~$1,718/month.
const us = calculateMortgage({
  marketId: 'us',
  price: 400_000,
  downPercent: 20,
  interestPercent: 5,
  monthlyFee: 0,
})
const pi = us.rows.find((row) => row.label.startsWith('Principal'))?.monthly ?? 0
check(
  'US principal+interest matches the standard formula',
  Math.abs(pi - 1717.83) < 1,
  `got ${pi.toFixed(2)}, expected ~1717.83`,
)

check(
  'US includes property tax and insurance',
  us.rows.some((r) => r.label.includes('Property tax')) &&
    us.rows.some((r) => r.label.includes('insurance')),
)
check(
  'US adds PMI below 20% down',
  calculateMortgage({
    marketId: 'us',
    price: 400_000,
    downPercent: 10,
    interestPercent: 5,
    monthlyFee: 0,
  }).rows.some((r) => r.label.includes('PMI')),
)
check('US omits PMI at 20% down', !us.rows.some((r) => r.label.includes('PMI')))
check(
  'UK has no property tax row (council tax is separate)',
  !calculateMortgage({
    marketId: 'uk',
    price: 400_000,
    downPercent: 10,
    interestPercent: 5,
    monthlyFee: 0,
  }).rows.some((r) => r.label.includes('Property tax')),
)
check('US/UK have no Swedish tax relief line', us.afterTaxRelief === null)

const se = calculateMortgage({
  marketId: 'se',
  price: 4_000_000,
  downPercent: 15,
  interestPercent: 3.5,
  monthlyFee: 0,
})
check(
  'SE still uses amortisation model',
  se.rows.some((r) => r.label.includes('Amortisation')),
)
check('SE keeps the interest tax deduction', se.afterTaxRelief !== null)
check(
  'SE amortisation is 2% above 70% LTV',
  se.rows.some((r) => r.label.includes('2% per year')),
)

console.log('Typo detector uses the right units\n')
check(
  '1500 sq ft is NOT flagged as huge in the US',
  checkPlausibility({ sqft: 1500 }, 'us').length === 0,
  'the old metric bounds would have flagged this',
)
check(
  '1500 m² IS flagged as huge in Sweden',
  checkPlausibility({ sqft: 1500 }, 'se').some((w) => w.message.includes('unusually large')),
)
check(
  '3 beds in 400 sq ft is flagged (US)',
  checkPlausibility({ beds: 3, sqft: 400 }, 'us').length > 0,
)
check(
  '3 beds in 1800 sq ft is fine (US)',
  checkPlausibility({ beds: 3, sqft: 1800 }, 'us').length === 0,
)
check(
  '3 beds in 23 m² still flagged (SE, the original bug)',
  checkPlausibility({ beds: 3, sqft: 23 }, 'se').length > 0,
)

console.log('\nProperty types per market\n')
for (const id of MARKET_IDS) {
  console.log(
    `  ${market(id).label.padEnd(16)} ${propertyTypesFor(id)
      .map((t) => t.label)
      .join(', ')}`,
  )
}
check(
  'US offers Condo',
  propertyTypesFor('us').some((t) => t.label === 'Condo'),
)
check(
  'UK offers Semi-detached',
  propertyTypesFor('uk').some((t) => t.label.includes('Semi')),
)
check(
  'US does NOT offer Holiday home',
  !propertyTypesFor('us').some((t) => t.value === 'holiday-home'),
)

console.log(`\n  ${failures === 0 ? 'all checks passed' : `${failures} FAILED`}\n`)
if (failures > 0) process.exitCode = 1
