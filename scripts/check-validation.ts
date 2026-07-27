import { listingFormSchema } from '../lib/validation'

/* eslint-disable no-console */

/**
 * Smoke checks for the listing form schema. The empty-string→null coercion is
 * the part most likely to break silently: '' must become null (price not
 * stated), never 0 (price is zero) — those are different claims.
 *
 *   npm run check:validation
 */
const base = {
  address: 'Storgatan 14, Stockholm',
  rawDescription: 'Top floor corner flat, renovated kitchen 2021, south-west balcony.',
}

function check(label: string, input: unknown) {
  const result = listingFormSchema.safeParse(input)

  if (result.success) {
    const { price, beds, baths, sqft, images } = result.data
    console.log(
      `  ${label.padEnd(32)} ok        ${JSON.stringify({ price, beds, baths, sqft, images: images.length })}`,
    )
  } else {
    const issue = result.error.issues[0]
    console.log(
      `  ${label.padEnd(32)} rejected  ${issue.path.join('.') || '(root)'}: ${issue.message}`,
    )
  }
}

console.log('\nlistingFormSchema:\n')
check('all numbers empty strings', { ...base, price: '', beds: '', baths: '', sqft: '' })
check('real values', { ...base, price: '7450000', beds: '3', baths: '1.5', sqft: '98' })
check('baths 1.3 (bad half-step)', { ...base, baths: '1.3' })
check('price non-numeric', { ...base, price: 'abc' })
check('address too short', { address: 'x', rawDescription: base.rawDescription })
check('notes too short', { address: base.address, rawDescription: 'small' })
check('valid blob image url', {
  ...base,
  images: [{ url: 'https://x.public.blob.vercel-storage.com/a.jpg', isCover: true }],
})
check('invalid image url', { ...base, images: [{ url: 'not-a-url', isCover: true }] })
console.log()
