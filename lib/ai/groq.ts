import OpenAI from 'openai'

import { LISTING_COPY_JSON_SCHEMA, SYSTEM_PROMPT, buildUserPrompt } from './prompt'
import { AiGenerationError, listingCopySchema, type ListingCopy, type ListingInput } from './types'

/** Generous enough that a three-paragraph description is never cut mid-sentence. */
const MAX_TOKENS = 2400

/**
 * GroqCloud — fast inference over open-weight models (Llama, gpt-oss, Qwen).
 *
 * NOT xAI's Grok. Different company, different endpoint, different key format
 * (Groq keys start with `gsk_`, xAI keys with `xai-`). Groq's API is
 * OpenAI-compatible, so we reuse the `openai` client with a different baseURL.
 *
 * GROQ_MODEL is env-driven because Groq rotates its model catalogue faster than
 * we want to redeploy. `GET /openai/v1/models` with your key lists what's live.
 */
function client(): OpenAI {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    throw new AiGenerationError('GROQ_API_KEY is not set', 'groq')
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1',
  })
}

export async function generateWithGroq(input: ListingInput): Promise<ListingCopy> {
  const model = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'
  const groq = client()

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(input) },
  ]

  let raw: string | null | undefined

  try {
    const completion = await groq.chat.completions.create({
      model,
      max_tokens: MAX_TOKENS,
      messages,
      // Schema-enforced output where the model supports it.
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'listing_copy',
          strict: true,
          schema: LISTING_COPY_JSON_SCHEMA,
        },
      },
    })

    raw = completion.choices[0]?.message?.content
  } catch (error) {
    // Not every Groq-hosted model accepts json_schema; most accept json_object.
    // Retry once at the looser level, restating the shape in the prompt. Zod
    // validation below still guarantees what we hand back to the app.
    if (!shouldRetryWithoutSchema(error)) {
      throw new AiGenerationError(`Groq request failed (model: ${model})`, 'groq', error)
    }

    try {
      const completion = await groq.chat.completions.create({
        model,
        max_tokens: MAX_TOKENS,
        messages: [
          messages[0],
          {
            role: 'user',
            content: `${buildUserPrompt(input)}

Respond with a single JSON object matching exactly this shape, and nothing else:
{"headline": string, "description": string, "highlights": string[]}`,
          },
        ],
        response_format: { type: 'json_object' },
      })

      raw = completion.choices[0]?.message?.content
    } catch (retryError) {
      throw new AiGenerationError(`Groq request failed (model: ${model})`, 'groq', retryError)
    }
  }

  if (!raw) {
    throw new AiGenerationError('Groq returned an empty response', 'groq')
  }

  return parseListingCopy(raw)
}

/**
 * Should we retry at the looser json_object level?
 *
 * Deliberately keyed on the status code alone, not the message text. Providers
 * word this failure differently — Groq returns "Failed to validate JSON. Please
 * adjust your prompt", which mentions neither `response_format` nor `schema`, so
 * an earlier message-matching version of this check silently failed to retry.
 * A 400/422 on a schema-enforced request is a format problem in practice, and if
 * the looser retry also fails we throw anyway.
 */
function shouldRetryWithoutSchema(error: unknown): boolean {
  if (!(error instanceof OpenAI.APIError)) return false

  return error.status === 400 || error.status === 422
}

/**
 * Rewrites the model's paragraph breaks into blank-line-separated form.
 *
 * The model separates paragraphs with a single newline (often followed by
 * indentation), but the public page splits on blank lines. Without this, a
 * well-structured three-paragraph description renders as one solid wall of text.
 * Normalising here means every provider's output is consistent downstream.
 */
function normalizeParagraphs(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n\n')
}

/**
 * Strip stray markdown fences, parse, then validate. Never trust the model to
 * have produced the right shape — open-weight models are especially prone to
 * wrapping JSON in ```json fences or prepending a sentence.
 */
export function parseListingCopy(raw: string): ListingCopy {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  let parsed: unknown

  try {
    parsed = JSON.parse(cleaned)
  } catch (error) {
    throw new AiGenerationError('Provider returned text that is not valid JSON', 'groq', error)
  }

  const result = listingCopySchema.safeParse(parsed)

  if (!result.success) {
    throw new AiGenerationError(
      `Provider JSON did not match the expected shape: ${result.error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'} ${issue.message}`)
        .join('; ')}`,
      'groq',
      result.error,
    )
  }

  return {
    headline: result.data.headline.trim(),
    description: normalizeParagraphs(result.data.description),
    highlights: result.data.highlights.map((highlight) => highlight.trim()),
  }
}
