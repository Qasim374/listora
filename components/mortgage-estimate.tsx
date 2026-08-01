'use client'

import { useState } from 'react'

import { formatPrice } from '@/lib/format'
import { market } from '@/lib/markets'
import { calculateMortgage } from '@/lib/mortgage'

export function MortgageEstimate({
  marketId,
  price,
  monthlyFee,
}: {
  marketId: string
  price: number
  monthlyFee: number | null
}) {
  const m = market(marketId)

  const [downPercent, setDownPercent] = useState(m.mortgage.defaultDownPercent)
  const [interestPercent, setInterestPercent] = useState(m.mortgage.defaultInterestPercent)

  const result = calculateMortgage({
    marketId,
    price,
    downPercent,
    interestPercent,
    monthlyFee,
  })

  return (
    <section>
      <h2 className="font-display text-lg text-brand-900">Estimated monthly cost</h2>

      <div className="card mt-3">
        <div className="grid gap-4">
          <div>
            <label htmlFor="downPercent" className="label">
              Down payment: {downPercent}% ({formatPrice(result.downPayment, marketId)})
            </label>
            <input
              id="downPercent"
              type="range"
              min={m.mortgage.minDownPercent}
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
              max={12}
              step={0.05}
              value={interestPercent}
              onChange={(event) => setInterestPercent(Number(event.target.value))}
              className="mt-3 w-full accent-brand-600"
            />
          </div>
        </div>

        <dl className="mt-6 space-y-2 border-t border-sand-200 pt-5 text-sm">
          <Row label="Loan amount" value={formatPrice(result.loan, marketId)} />
          {result.rows.map((row) => (
            <Row
              key={row.label}
              label={row.label}
              value={`${formatPrice(Math.round(row.monthly), marketId)} / month`}
            />
          ))}
        </dl>

        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 border-t border-sand-200 pt-5">
          <span className="font-medium text-ink">Total per month</span>
          <span className="font-display text-2xl text-brand-700">
            {formatPrice(Math.round(result.totalMonthly), marketId)}
          </span>
        </div>

        {result.afterTaxRelief !== null ? (
          <p className="mt-1.5 text-sm text-ink-muted">
            {formatPrice(Math.round(result.afterTaxRelief), marketId)} after the 30% interest tax
            deduction
          </p>
        ) : null}

        <p className="mt-4 text-xs leading-relaxed text-ink-muted">{result.notes}</p>
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
