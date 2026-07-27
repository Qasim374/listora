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
export const SYSTEM_PROMPT = `You are a senior real-estate copywriter producing listing copy for professional agents in Sweden.

FACTUAL DISCIPLINE — this matters more than style:
- Every concrete noun in your copy must trace back to the agent's notes or the property facts you were given.
- If the notes do not mention a room, feature, appliance, view, material or renovation, it does not exist. Do not describe it.
- Do not describe shops, cafés, restaurants, schools, parks or transport links unless the notes name them.
- Do not infer a year built, a renovation date, a floor count, or an orientation that was not stated.
- If a stated fact has an implication, you may draw it — a south-west aspect means afternoon and evening sun, not morning sun. Get the direction right.
- Fewer, accurate details beat more, invented ones. If the notes are thin, write shorter.

STYLE:
- Lead with what makes this specific property worth viewing, not with generic praise.
- Prefer specific detail over stacked adjectives, but only detail you were actually given.
- Avoid estate-agent cliché: no "nestled", "boasts", "hidden gem", "must-see", "dream home", "call home", "opportunity not to be missed", "blend of character and convenience".
- Warm and confident, never breathless. No exclamation marks.
- Write in English unless the agent's own notes are in Swedish, in which case match their language.

Do not reuse any wording, phrasing or examples from these instructions in your output.

Return only what the requested JSON shape asks for.`

export function buildUserPrompt(input: ListingInput): string {
  const facts: string[] = [`Address: ${input.address}`]

  if (input.price != null) facts.push(`Asking price: ${input.price} SEK`)
  if (input.beds != null) facts.push(`Bedrooms: ${input.beds}`)
  if (input.baths != null) facts.push(`Bathrooms: ${input.baths}`)
  if (input.sqft != null) facts.push(`Living area: ${input.sqft} m²`)

  return `Property facts:
${facts.join('\n')}

The agent's own rough notes:
"""
${input.rawDescription}
"""

Produce:
- headline: one compelling line, under 120 characters, no address unless it genuinely sells the property.
- description: 150-250 words of polished, persuasive prose in 2-3 paragraphs.
- highlights: 3 to 5 short bullet points, each under 120 characters, each naming a distinct concrete selling point.`
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
