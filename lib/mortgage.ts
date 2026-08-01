import { market, type Market } from './markets'

export type MortgageBreakdown = {
  loan: number
  downPayment: number
  /** Rows to render, in order. Zero-value rows are omitted. */
  rows: Array<{ label: string; monthly: number }>
  totalMonthly: number
  /** Sweden only: total after the interest tax deduction. */
  afterTaxRelief: number | null
  notes: string
}

/**
 * Standard amortising payment: the fixed monthly amount that clears a loan over
 * n months at monthly rate r.
 *
 *   M = P · r(1+r)^n / ((1+r)^n − 1)
 *
 * Used for US and UK repayment mortgages. Falls back to simple division at a 0%
 * rate, where the formula divides by zero.
 */
function amortisingPayment(principal: number, annualRatePercent: number, years: number): number {
  const months = years * 12
  if (months <= 0) return 0

  const r = annualRatePercent / 100 / 12
  if (r === 0) return principal / months

  const growth = Math.pow(1 + r, months)
  return (principal * (r * growth)) / (growth - 1)
}

/** Sweden's amorteringskrav: annual amortisation rate by loan-to-value. */
function swedishAmortisationRate(m: Market, loanToValue: number): number {
  for (const tier of m.mortgage.amortisationTiers ?? []) {
    if (loanToValue > tier.aboveLtv) return tier.rate
  }
  return 0
}

export function calculateMortgage(input: {
  marketId: string | null
  price: number
  downPercent: number
  interestPercent: number
  monthlyFee: number | null
}): MortgageBreakdown {
  const m = market(input.marketId)
  const { price, downPercent, interestPercent } = input

  const downPayment = Math.round(price * (downPercent / 100))
  const loan = Math.max(0, price - downPayment)
  const loanToValue = price > 0 ? loan / price : 0
  const fee = input.monthlyFee ?? 0

  const rows: Array<{ label: string; monthly: number }> = []

  if (m.mortgage.model === 'interest-plus-amortisation') {
    const interest = (loan * (interestPercent / 100)) / 12
    const amortisationRate = swedishAmortisationRate(m, loanToValue)
    const amortisation = (loan * amortisationRate) / 12

    rows.push({ label: 'Interest', monthly: interest })
    rows.push({
      label: `Amortisation (${(amortisationRate * 100).toFixed(0)}% per year)`,
      monthly: amortisation,
    })
    if (fee > 0) rows.push({ label: m.monthlyFeeLabel, monthly: fee })

    const total = interest + amortisation + fee
    const relief = m.mortgage.interestTaxRelief ?? 0

    return {
      loan,
      downPayment,
      rows,
      totalMonthly: total,
      afterTaxRelief: interest * (1 - relief) + amortisation + fee,
      notes: m.mortgage.notes,
    }
  }

  // US / UK: one repayment covering principal and interest
  const principalAndInterest = amortisingPayment(loan, interestPercent, m.mortgage.termYears)
  rows.push({
    label: `Principal & interest (${m.mortgage.termYears} yr)`,
    monthly: principalAndInterest,
  })

  const propertyTax = (price * m.mortgage.propertyTaxRate) / 12
  if (propertyTax > 0) rows.push({ label: 'Property tax (est.)', monthly: propertyTax })

  const insurance = (price * m.mortgage.insuranceRate) / 12
  if (insurance > 0) rows.push({ label: 'Home insurance (est.)', monthly: insurance })

  // US PMI: charged while the deposit is below the threshold
  let mortgageInsurance = 0
  if (
    m.mortgage.mortgageInsuranceThreshold > 0 &&
    downPercent < m.mortgage.mortgageInsuranceThreshold
  ) {
    mortgageInsurance = (loan * m.mortgage.mortgageInsuranceRate) / 12
    rows.push({ label: 'Mortgage insurance (PMI)', monthly: mortgageInsurance })
  }

  if (fee > 0) rows.push({ label: m.monthlyFeeLabel, monthly: fee })

  return {
    loan,
    downPayment,
    rows,
    totalMonthly: principalAndInterest + propertyTax + insurance + mortgageInsurance + fee,
    afterTaxRelief: null,
    notes: m.mortgage.notes,
  }
}
