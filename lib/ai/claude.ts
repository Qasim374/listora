import { AiGenerationError, type ListingCopy, type ListingInput } from './types'

/**
 * Claude implementation — intentionally not wired up yet.
 *
 * We're starting on Groq (AI_PROVIDER=groq). When you want to compare quality,
 * this is the only file that needs writing, plus flipping AI_PROVIDER=claude.
 * Nothing else in the app changes.
 *
 * To implement:
 *   npm install @anthropic-ai/sdk
 *
 *   import Anthropic from '@anthropic-ai/sdk'
 *   import { LISTING_COPY_JSON_SCHEMA, SYSTEM_PROMPT, buildUserPrompt } from './prompt'
 *   import { listingCopySchema } from './types'
 *
 *   const client = new Anthropic()  // reads ANTHROPIC_API_KEY
 *
 *   const response = await client.messages.create({
 *     model: 'claude-sonnet-5',
 *     max_tokens: 2000,
 *     system: SYSTEM_PROMPT,
 *     messages: [{ role: 'user', content: buildUserPrompt(input) }],
 *     output_config: {
 *       format: { type: 'json_schema', schema: LISTING_COPY_JSON_SCHEMA },
 *     },
 *   })
 *
 * output_config.format gives schema-guaranteed JSON, so the fence-stripping and
 * retry dance in groq.ts isn't needed here — parse the first text block and run
 * it through listingCopySchema as a belt-and-braces check.
 */
export async function generateWithClaude(_input: ListingInput): Promise<ListingCopy> {
  throw new AiGenerationError(
    'The Claude provider is not implemented yet. Set AI_PROVIDER=grok, or implement lib/ai/claude.ts.',
    'claude',
  )
}
