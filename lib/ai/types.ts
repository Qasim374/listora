import { z } from 'zod'

/** Facts the agent supplies. Everything except rawDescription is optional. */
export type ListingInput = {
  address: string
  rawDescription: string
  price?: number | null
  beds?: number | null
  baths?: number | null
  sqft?: number | null
}

/**
 * The contract every provider must satisfy. The rest of the app knows only
 * this shape — never which model produced it.
 */
export const listingCopySchema = z.object({
  headline: z.string().min(10).max(160),
  description: z.string().min(100),
  highlights: z.array(z.string().min(3).max(160)).min(3).max(5),
})

export type ListingCopy = z.infer<typeof listingCopySchema>

/** 'groq' = GroqCloud (open-weight models). Not xAI's Grok. */
export type AiProvider = 'groq' | 'claude'

export class AiGenerationError extends Error {
  constructor(
    message: string,
    readonly provider: AiProvider,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'AiGenerationError'
  }
}
