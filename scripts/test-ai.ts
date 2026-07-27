import { config } from 'dotenv'

config({ path: '.env.local' })

/* eslint-disable no-console */

/**
 * Exercises the real generateListingCopy() code path against one or more models
 * so you can compare output quality before committing to a default.
 *
 *   npm run ai:test
 *   npm run ai:test -- llama-3.3-70b-versatile openai/gpt-oss-120b
 *
 * Prints latency and the full generated copy for each model.
 */
const SAMPLE = {
  address: 'Storgatan 14, 114 55 Stockholm',
  price: 7_450_000,
  beds: 3,
  baths: 1.5,
  sqft: 98,
  rawDescription:
    '3 rooms, top floor, corner apartment. Renovated kitchen 2021. Balcony faces south-west. Building from 1928, lift installed 2019. Close to Karlaplan metro.',
}

async function main() {
  const { generateListingCopy, AiGenerationError } = await import('../lib/ai')

  const models = process.argv.slice(2)
  const targets = models.length > 0 ? models : [process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile']

  console.log(`\nProvider: ${process.env.AI_PROVIDER ?? 'groq'}`)
  console.log(`Testing ${targets.length} model(s) on the same sample listing.\n`)

  for (const model of targets) {
    // generateListingCopy reads GROQ_MODEL from the environment, so we set it
    // per iteration rather than threading a model argument through the adapter.
    process.env.GROQ_MODEL = model

    console.log('─'.repeat(76))
    console.log(`MODEL: ${model}`)
    console.log('─'.repeat(76))

    const startedAt = Date.now()

    try {
      const copy = await generateListingCopy(SAMPLE)
      const elapsed = Date.now() - startedAt

      console.log(`✓ ${elapsed} ms\n`)
      console.log(`HEADLINE (${copy.headline.length} chars)`)
      console.log(`  ${copy.headline}\n`)
      console.log(`DESCRIPTION (${copy.description.split(/\s+/).length} words)`)
      for (const paragraph of copy.description.split(/\n\s*\n/)) {
        console.log(`  ${paragraph.trim()}\n`)
      }
      console.log(`HIGHLIGHTS (${copy.highlights.length})`)
      for (const highlight of copy.highlights) {
        console.log(`  • ${highlight}`)
      }
      console.log()
    } catch (error) {
      const elapsed = Date.now() - startedAt

      if (error instanceof AiGenerationError) {
        console.log(`✗ ${elapsed} ms — ${error.message}`)
        if (error.cause instanceof Error) {
          console.log(`  cause: ${error.cause.message.split('\n')[0]}`)
        }
      } else {
        console.log(`✗ ${elapsed} ms — unexpected error:`, error)
      }
      console.log()
    }
  }
}

main().catch((error) => {
  console.error('\nTest harness failed:\n', error)
  process.exitCode = 1
})
