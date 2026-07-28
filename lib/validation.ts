import { z } from 'zod'

import { MAX_IMAGES_PER_LISTING } from './blob'
import { PROPERTY_TYPE_VALUES } from './property-types'

/**
 * Empty form fields arrive as '' and must become null, not 0 — "price not
 * stated" and "price is zero" are different claims about a property.
 *
 * `label` supplies a human error message: without it, a non-numeric entry
 * surfaces Zod's internal "Expected number, received nan", which is not
 * something to show an estate agent.
 */
function nullableNumber(label: string, inner: z.ZodNumber) {
  // Hand-rolled rather than `preprocess` + `union`: a union reports its own
  // "Invalid input" and discards both the NaN message and `inner`'s messages
  // ("must be a whole number", "in steps of 0.5"). Transforming manually keeps
  // every message intact.
  return z.any().transform((value, ctx): number | null => {
    if (value === '' || value === null || value === undefined) return null

    const numeric = typeof value === 'number' ? value : Number(value)

    if (Number.isNaN(numeric)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be a number` })
      return z.NEVER
    }

    const parsed = inner.safeParse(numeric)

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue.message })
      }
      return z.NEVER
    }

    return parsed.data
  })
}

export const listingFormSchema = z.object({
  address: z.string().trim().min(5, 'Enter the full address').max(200, 'Address is too long'),

  rawDescription: z
    .string()
    .trim()
    .min(20, 'Add at least a sentence or two for the AI to work from')
    .max(4000, 'Keep your notes under 4000 characters'),

  price: nullableNumber(
    'Price',
    z.number().int('Price must be a whole number').min(0).max(2_000_000_000),
  ),
  beds: nullableNumber(
    'Bedrooms',
    z.number().int('Bedrooms must be a whole number').min(0).max(50),
  ),
  baths: nullableNumber(
    'Bathrooms',
    z.number().min(0).max(50).multipleOf(0.5, 'Bathrooms must be in steps of 0.5'),
  ),
  sqft: nullableNumber(
    'Living area',
    z.number().int('Living area must be a whole number').min(0).max(100_000),
  ),

  propertyType: z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.enum(PROPERTY_TYPE_VALUES as [string, ...string[]]).nullable(),
  ),
  yearBuilt: nullableNumber(
    'Year built',
    z
      .number()
      .int('Year built must be a whole number')
      .min(1200, 'Year built looks too early')
      // Buildings are sold before completion, so allow a little into the future
      .max(new Date().getFullYear() + 5, 'Year built is too far in the future'),
  ),
  lotSize: nullableNumber(
    'Plot size',
    z.number().int('Plot size must be a whole number').min(0).max(10_000_000),
  ),
  monthlyFee: nullableNumber(
    'Monthly fee',
    z.number().int('Monthly fee must be a whole number').min(0).max(500_000),
  ),

  // Submitted as one-per-line text; blanks and duplicates are dropped here so
  // the display never has to defend against them.
  features: z.preprocess(
    (value) =>
      typeof value === 'string'
        ? Array.from(
            new Set(
              value
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter((line) => line.length > 0),
            ),
          )
        : value,
    z.array(z.string().min(2).max(80)).max(40, 'Up to 40 features').default([]),
  ),

  images: z
    .array(
      z.object({
        url: z.string().url('An uploaded photo has an invalid URL'),
        isCover: z.boolean(),
      }),
    )
    .max(MAX_IMAGES_PER_LISTING, `Up to ${MAX_IMAGES_PER_LISTING} images per listing`)
    .default([]),
})

export type ListingFormValues = z.input<typeof listingFormSchema>
export type ListingFormParsed = z.output<typeof listingFormSchema>

/**
 * What the agent may save after editing the generated copy.
 *
 * Deliberately looser than `listingCopySchema` in lib/ai: that one constrains
 * what we accept *from a model*, where a too-short description means the model
 * underdelivered. Here the agent is the author — if they want a four-word
 * headline or two highlights, that's their call, not a validation error.
 */
export const listingCopyEditSchema = z.object({
  headline: z.string().trim().min(5, 'Headline is too short').max(200, 'Headline is too long'),
  description: z
    .string()
    .trim()
    .min(50, 'Description is too short to publish')
    .max(8000, 'Description is too long'),
  highlights: z
    .array(z.string().trim().min(2, 'Highlights cannot be blank').max(200, 'Highlight is too long'))
    .max(8, 'Up to 8 highlights'),
})

export type ListingCopyEdit = z.output<typeof listingCopyEditSchema>
