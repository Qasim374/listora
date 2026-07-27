import { generateWithClaude } from './claude'
import { generateWithGroq } from './groq'
import { AiGenerationError, type AiProvider, type ListingCopy, type ListingInput } from './types'

export * from './types'

function activeProvider(): AiProvider {
  const configured = process.env.AI_PROVIDER ?? 'groq'

  if (configured !== 'groq' && configured !== 'claude') {
    throw new AiGenerationError(
      `Unknown AI_PROVIDER "${configured}". Expected "groq" or "claude".`,
      'groq',
    )
  }

  return configured
}

/**
 * The app's one and only entry point for AI copy generation.
 *
 * Every caller — the upload flow, the regenerate button, any future batch job —
 * goes through here and receives the same validated ListingCopy regardless of
 * which model is behind it. Swapping providers is an env var.
 */
export async function generateListingCopy(input: ListingInput): Promise<ListingCopy> {
  const provider = activeProvider()

  switch (provider) {
    case 'groq':
      return generateWithGroq(input)
    case 'claude':
      return generateWithClaude(input)
  }
}

export function getActiveProvider(): AiProvider {
  return activeProvider()
}
