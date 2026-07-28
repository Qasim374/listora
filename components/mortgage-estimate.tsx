'use client'

import { useState } from 'react'

import { formatPrice } from '@/lib/utils'

/**
 * Swedish mortgage cap: at most 85% of the purchase price may be borrowed, so
 * the slider's floor enforces the rule and no over-cap state is reachable.
 */
const MIN_DOWN_PAYMENT_PERCENT = 15

/**
 * Swedish amortisation requirement (amorteringskrav), by loan-to-value:
 *   above 70%  -> 2% of the loan per year
 *   50% to 70% -> 1% per year
 *   below 50%  -> none required
 *
 * There is a further +1% rule when the loan exceeds 4.5x gross household
 * income, deliberately not modelled: we don't know the buyer's income, and
 * guessing it would make the figure look precise while being wrong.
 */
function amortisationRate(loanToValue: number): number {
  if (loanToValue > 0.7) return 0.02
  if (loanToValue > 0.5) return 0.01
  return 0
}

export function MortgageEstimate({
  price,
  monthlyFee,
}: {
  price: number
  monthlyFee: number | null
}) {
  const [downPercent, setDownPercent] = useState(MIN_DOWN_PAYMENT_PERCENT)
  const [interestPercent, setInterestPercent] = useState(3.5)

  const downPayment = Math.round(price * (downPercent / 100))
  const loan = Math.max(0, price - downPayment)
  const loanToValue = price > 0 ? loan / price : 0

  const monthlyInterest = (loan * (interestPercent / 100)) / 12
  const monthlyAmortisation = (loan * amortisationRate(loanToValue)) / 12
  const fee = monthlyFee ?? 0

  const total = monthlyInterest + monthlyAmortisation + fee
  // 30% of mortgage interest is deductible against tax in Sweden.
  const afterDeduction = monthlyInterest * 0.7 + monthlyAmortisation + fee

  return (
    <section>
      <h2 className="font-display text-lg text-brand-900">Estimated monthly cost</h2>

      <div className="card mt-3">
        {/* Single column: this lives in a narrow sidebar, not full width */}
        <div className="grid gap-4">
          <div>
            <label htmlFor="downPercent" className="label">
              Down payment: {downPercent}% ({formatPrice(downPayment)})
            </label>
            <input
              id="downPercent"
              type="range"
              min={MIN_DOWN_PAYMENT_PERCENT}
              max={100}
              step={1}
              value={downPercent}
              onChange={(event) => setDownPercent(Number(event.target.value))}
              className="mt-3 w-full accent-brand-600"
            />
          </div>

          <div>
            <label htmlFor="interestPercent" className="label">
              Interest rate: {interestPercent.toFixed(2)}%
            </label>
            <input
              id="interestPercent"
              type="range"
              min={0.5}
              max={8}
              step={0.05}
              value={interestPercent}
              onChange={(event) => setInterestPercent(Number(event.target.value))}
              className="mt-3 w-full accent-brand-600"
            />
          </div>
        </div>

        <dl className="mt-6 space-y-2 border-t border-sand-200 pt-5 text-sm">
          <Row label="Loan amount" value={formatPrice(loan)} />
          <Row label="Interest" value={`${formatPrice(Math.round(monthlyInterest))} / month`} />
          <Row
            label={`Amortisation (${(amortisationRate(loanToValue) * 100).toFixed(0)}% per year)`}
            value={`${formatPrice(Math.round(monthlyAmortisation))} / month`}
          />
          {monthlyFee !== null ? (
            <Row label="Monthly fee" value={`${formatPrice(fee)} / month`} />
          ) : null}
        </dl>

        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 border-t border-sand-200 pt-5">
          <span className="font-medium text-ink">Total per month</span>
          <span className="font-display text-2xl text-brand-700">
            {formatPrice(Math.round(total))}
          </span>
        </div>

        <p className="mt-1.5 text-sm text-ink-muted">
          {formatPrice(Math.round(afterDeduction))} after the 30% interest tax deduction
        </p>

        <p className="mt-4 text-xs leading-relaxed text-ink-muted">
          An estimate only, using the Swedish amortisation requirement and a 30% interest deduction.
          It does not include income-based limits, insurance, or maintenance. Not a loan offer —
          confirm figures with your bank.
        </p>
      </div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  )
}
