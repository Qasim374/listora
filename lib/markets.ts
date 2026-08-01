/**
 * Per-market configuration: currency, units, wording and mortgage rules.
 *
 * This exists because the app was originally built Sweden-only and hardcoded
 * SEK, m² and the Swedish amortisation requirement. Showing a US buyer a price in
 * kronor — or quoting them Swedish mortgage law — is exactly the kind of
 * confidently-wrong output the rest of the product works hard to avoid.
 *
 * The market is stored ON EACH LISTING, not just on the agent. If it lived only
 * on the agent and they later changed country, every historical listing's
 * `329000` would silently relabel from dollars to pounds. Storing it with the
 * listing keeps the number true forever.
 */

export type MarketId = 'us' | 'uk' | 'se'

/**
 * How monthly cost is calculated.
 *
 *  'amortizing'  — one repayment covering interest + principal over a fixed term
 *                  (US, UK). Property tax and insurance added where relevant.
 *  'interest-plus-amortisation' — Sweden, where the loan is interest-only plus a
 *                  legally-mandated amortisation percentage.
 */
export type MortgageModel = 'amortizing' | 'interest-plus-amortisation'

export type Market = {
  id: MarketId
  label: string
  currency: string
  /** Drives number grouping and decimal separators. */
  locale: string
  /** Interior area unit. */
  areaUnit: 'sqft' | 'sqm'
  areaSuffix: string
  /** What the recurring building charge is called here. */
  monthlyFeeLabel: string
  /** What the agent's professional number is called here. */
  licenseLabel: string
  phonePlaceholder: string
  /** Map view before any pin is placed. */
  mapCenter: { latitude: number; longitude: number }
  /** Nominatim language preference. */
  geocodeLanguage: string
  /** Property type values offered, in display order. */
  propertyTypes: string[]

  mortgage: {
    model: MortgageModel
    /** Minimum deposit as a percentage of price. */
    minDownPercent: number
    defaultDownPercent: number
    defaultInterestPercent: number
    /** Loan term in years. Unused by the Swedish model. */
    termYears: number
    /** Annual property tax as a share of price. 0 where not paid monthly. */
    propertyTaxRate: number
    /** Annual buildings/home insurance as a share of price. */
    insuranceRate: number
    /**
     * Below this deposit, mortgage insurance applies (US PMI), charged annually
     * as a share of the loan. 0 disables it.
     */
    mortgageInsuranceThreshold: number
    mortgageInsuranceRate: number
    /** Sweden only: amortisation tiers by loan-to-value. */
    amortisationTiers?: Array<{ aboveLtv: number; rate: number }>
    /** Sweden only: share of interest deductible against tax. */
    interestTaxRelief?: number
    /** Shown under the estimate. */
    notes: string
  }

  /**
   * Bounds for the typo detector, in this market's area unit.
   *
   * `areaPerBedroom` is compared against TOTAL living area, not the bedroom
   * alone — so it has to allow for a kitchen, bathroom and hallway too. An
   * earlier version used the size of a bedroom by itself, which meant "3 beds in
   * 400 sq ft" sailed through as plausible.
   */
  plausibility: {
    minArea: number
    maxArea: number
    areaPerBedroom: number
    lowPrice: number
  }
}

export const MARKETS: Record<MarketId, Market> = {
  us: {
    id: 'us',
    label: 'United States',
    currency: 'USD',
    locale: 'en-US',
    areaUnit: 'sqft',
    areaSuffix: 'sq ft',
    monthlyFeeLabel: 'HOA fee',
    licenseLabel: 'License #',
    phonePlaceholder: '(555) 123-4567',
    mapCenter: { latitude: 39.8283, longitude: -98.5795 },
    geocodeLanguage: 'en',
    propertyTypes: ['single-family', 'condo', 'townhouse', 'multi-family', 'plot', 'other'],
    mortgage: {
      model: 'amortizing',
      minDownPercent: 3,
      defaultDownPercent: 20,
      defaultInterestPercent: 6.5,
      termYears: 30,
      // National averages. Deliberately approximate — the disclaimer says so.
      propertyTaxRate: 0.011,
      insuranceRate: 0.008,
      mortgageInsuranceThreshold: 20,
      mortgageInsuranceRate: 0.006,
      notes:
        'Estimate only, using national averages for property tax and insurance. PMI is included below 20% down. Excludes closing costs and utilities. Not a loan offer.',
    },
    plausibility: { minArea: 150, maxArea: 20_000, areaPerBedroom: 170, lowPrice: 20_000 },
  },

  uk: {
    id: 'uk',
    label: 'United Kingdom',
    currency: 'GBP',
    locale: 'en-GB',
    areaUnit: 'sqft',
    areaSuffix: 'sq ft',
    monthlyFeeLabel: 'Service charge',
    licenseLabel: 'Registration no.',
    phonePlaceholder: '07700 900123',
    mapCenter: { latitude: 54.093, longitude: -2.8935 },
    geocodeLanguage: 'en-GB',
    propertyTypes: ['detached', 'semi-detached', 'terraced', 'flat', 'bungalow', 'plot', 'other'],
    mortgage: {
      model: 'amortizing',
      minDownPercent: 5,
      defaultDownPercent: 10,
      defaultInterestPercent: 4.5,
      termYears: 25,
      // Council tax is billed separately and banded, not a share of price, so
      // it is excluded rather than guessed at.
      propertyTaxRate: 0,
      insuranceRate: 0.003,
      mortgageInsuranceThreshold: 0,
      mortgageInsuranceRate: 0,
      notes:
        'Estimate only, based on a repayment mortgage over 25 years. Excludes council tax, stamp duty and ground rent. Not a mortgage offer.',
    },
    plausibility: { minArea: 150, maxArea: 20_000, areaPerBedroom: 170, lowPrice: 20_000 },
  },

  se: {
    id: 'se',
    label: 'Sweden',
    currency: 'SEK',
    locale: 'sv-SE',
    areaUnit: 'sqm',
    areaSuffix: 'm²',
    monthlyFeeLabel: 'Monthly fee',
    licenseLabel: 'Reg. no.',
    phonePlaceholder: '+46 70 123 45 67',
    mapCenter: { latitude: 59.3293, longitude: 18.0686 },
    geocodeLanguage: 'sv,en',
    propertyTypes: ['apartment', 'house', 'townhouse', 'holiday-home', 'plot', 'other'],
    mortgage: {
      model: 'interest-plus-amortisation',
      minDownPercent: 15, // mortgage cap: max 85% LTV
      defaultDownPercent: 15,
      defaultInterestPercent: 3.5,
      termYears: 0,
      propertyTaxRate: 0,
      insuranceRate: 0,
      mortgageInsuranceThreshold: 0,
      mortgageInsuranceRate: 0,
      // amorteringskrav
      amortisationTiers: [
        { aboveLtv: 0.7, rate: 0.02 },
        { aboveLtv: 0.5, rate: 0.01 },
      ],
      interestTaxRelief: 0.3,
      notes:
        'Estimate only, using the Swedish amortisation requirement and a 30% interest deduction. Excludes income-based limits, insurance and maintenance. Not a loan offer.',
    },
    plausibility: { minArea: 15, maxArea: 1_000, areaPerBedroom: 15, lowPrice: 100_000 },
  },
}

export const MARKET_IDS = Object.keys(MARKETS) as MarketId[]
export const DEFAULT_MARKET: MarketId = 'us'

/** Falls back to the default so an unknown stored value never breaks a page. */
export function market(id: string | null | undefined): Market {
  return MARKETS[id as MarketId] ?? MARKETS[DEFAULT_MARKET]
}

/**
 * Labels for every property type across all markets.
 *
 * Kept as one flat map rather than per-market, so a listing whose market changes
 * still renders its stored type instead of going blank.
 */
export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  'single-family': 'Single-family home',
  condo: 'Condo',
  'multi-family': 'Multi-family',
  detached: 'Detached house',
  'semi-detached': 'Semi-detached house',
  terraced: 'Terraced house',
  flat: 'Flat',
  bungalow: 'Bungalow',
  apartment: 'Apartment',
  house: 'House',
  townhouse: 'Townhouse',
  'holiday-home': 'Holiday home',
  plot: 'Plot / land',
  other: 'Other',
}
