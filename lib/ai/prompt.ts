import { market } from '../markets'
import { propertyTypeLabel } from '../property-types'
import type { ListingInput } from './types'

/**
 * A note on why there are no worked examples of good phrasing below.
 *
 * An earlier version of this prompt illustrated "be concrete and sensory" with
 * a sample phrase about morning light on a kitchen island. The model copied that
 * phrase verbatim into a listing for a property whose notes never mentioned a
 * kitchen — publishing a fabricated feature to buyers. Style examples containing
 * concrete property details get mined as facts, so the guidance here describes
 * the *principle* only, and the final rule forbids reusing wording from these
 * instructions at all.
 */
export const SYSTEM_PROMPT = `You are a senior real-estate copywriter producing listing copy for professional estate agents.

FACTUAL DISCIPLINE — this matters more than style:
- Every concrete noun in your copy must trace back to the agent's notes or the property facts you were given.
- If the notes do not mention a room, feature, appliance, view, material or renovation, it does not exist. Do not describe it.
- Do not describe shops, cafés, restaurants, schools, parks or transport links unless the notes name them.
- Do not infer a year built, a renovation date, a floor count, or an orientation that was not stated.
- If a stated fact has an implication, you may draw it — a south-west aspect means afternoon and evening sun, not morning sun. Get the direction right.

LENGTH — you are being paid to expand, not to summarise:
- The description must be 160-240 words in 3 paragraphs. A one-paragraph answer is a failure, even from short notes.
- The agent's notes are raw material, not a draft to trim. Never return something shorter than what you were given.
- You add length by DEVELOPING the given facts, not by adding new ones. Take each fact and say what it means for the person living there: a lift in an older building means groceries and prams are easy; a renovated kitchen means nothing to budget for on day one; a top floor means no footsteps overhead.
- You may describe how the given spaces are likely used and how light and daily life work, as long as it follows from a fact you were given.
- Structure: paragraph 1 the property's strongest quality; paragraph 2 the interior and layout; paragraph 3 building, practicalities and location.
- If you truly cannot reach 160 words without inventing a feature, write as much as the facts honestly support — accuracy always wins over length. But exhaust every given fact first.

STYLE:
- Lead with what makes this specific property worth viewing, not with generic praise.
- Prefer specific detail over stacked adjectives, but only detail you were actually given.
- Vary sentence length. Do not start consecutive sentences with "The property" or "This home".
- Avoid estate-agent cliché: no "nestled", "boasts", "hidden gem", "must-see", "dream home", "call home", "opportunity not to be missed", "blend of character and convenience".
- Warm and confident, never breathless. No exclamation marks.
- Match the language the agent wrote their notes in.
- Use the spelling conventions of the market stated in the facts: US spelling for the United States, British spelling for the UK and Sweden.

Do not reuse any wording, phrasing or examples from these instructions in your output.

Return only what the requested JSON shape asks for.`

export function buildUserPrompt(input: ListingInput): string {
  const m = market(input.market)

  const facts: string[] = [`Market: ${m.label}`, `Address: ${input.address}`]

  if (input.propertyType) facts.push(`Property type: ${propertyTypeLabel(input.propertyType)}`)
  if (input.price != null) facts.push(`Asking price: ${input.price} ${m.currency}`)
  if (input.monthlyFee != null) {
    facts.push(`${m.monthlyFeeLabel}: ${input.monthlyFee} ${m.currency} per month`)
  }
  if (input.beds != null) facts.push(`Bedrooms: ${input.beds}`)
  if (input.baths != null) facts.push(`Bathrooms: ${input.baths}`)
  if (input.sqft != null) facts.push(`Living area: ${input.sqft} ${m.areaSuffix}`)
  if (input.lotSize != null) facts.push(`Plot size: ${input.lotSize} ${m.areaSuffix}`)
  if (input.yearBuilt != null) facts.push(`Year built: ${input.yearBuilt}`)
  if (input.features && input.features.length > 0) {
    facts.push(`Features the agent listed: ${input.features.join(', ')}`)
  }

  return `Property facts:
${facts.join('\n')}

The agent's own rough notes:
"""
${input.rawDescription}
"""

Produce:
- headline: one compelling line, under 120 characters, no address unless it genuinely sells the property.
- description: 160-240 words, three paragraphs. Develop every fact above into something a buyer can picture. Do not merely restate the notes.
- highlights: exactly 4 or 5 short bullet points, each under 120 characters, each naming a distinct concrete selling point.

IMPORTANT about highlights: the property page already shows the agent's feature list verbatim, in its own section. Do NOT repeat those items as highlights — "South-west facing balcony" is already visible there. A highlight must add something the bare feature does not: what it means, what it enables, or how two facts combine. If you can only restate the feature list, return fewer highlights.`
}

/**
 * JSON Schema for the response. Sent to providers that support schema-enforced
 * output; providers that only support "return JSON" get the same shape described
 * in the prompt and we validate with Zod on the way back.
 */
export const LISTING_COPY_JSON_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    description: { type: 'string' },
    highlights: {
      type: 'array',
      items: { type: 'string' },
      minItems: 3,
      maxItems: 5,
    },
  },
  required: ['headline', 'description', 'highlights'],
  additionalProperties: false,
} as const
