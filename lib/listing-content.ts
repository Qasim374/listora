/**
 * Keeps Highlights and Features from saying the same thing twice.
 *
 * The two sections have genuinely different jobs:
 *   Highlights — 4-5 AI-written lines arguing why this property is worth seeing
 *   Features   — the agent's full factual amenity checklist
 *
 * They collided because the AI receives the feature list as input, so it tended
 * to hand back "South-west facing balcony" as a highlight when that exact string
 * was already a feature. The prompt now tells it not to, but a model will drift,
 * so the display also filters — belt and braces.
 *
 * Features is the canonical factual list, so an overlapping item is dropped from
 * HIGHLIGHTS, not from Features: silently deleting a line the agent typed would
 * be worse than a slightly shorter highlight list.
 */
function normalize(value: string): string {
  return (
    value
      .toLowerCase()
      // Drop parenthetical asides so "Renovated kitchen (2021)" matches
      // "renovated kitchen"
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[^a-z0-9åäö ]+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

/** True when either string contains the other — catches near-duplicates. */
function overlaps(a: string, b: string): boolean {
  if (a === '' || b === '') return false
  if (a === b) return true

  // Only treat containment as duplication for substantial strings; "lift"
  // inside "lift installed 2019" is a duplicate, but two-letter overlaps are noise.
  const shorter = a.length <= b.length ? a : b
  const longer = a.length <= b.length ? b : a

  return shorter.length >= 8 && longer.includes(shorter)
}

export type SplitContent = {
  highlights: string[]
  features: string[]
  /** How many highlights were dropped as duplicates — useful in the editor. */
  removed: number
}

export function splitHighlightsAndFeatures(
  rawHighlights: string[] | null | undefined,
  rawFeatures: string[] | null | undefined,
): SplitContent {
  const features = (rawFeatures ?? []).filter((item) => item.trim() !== '')
  const normalizedFeatures = features.map(normalize)

  const highlights: string[] = []
  const seen: string[] = []
  let removed = 0

  for (const highlight of rawHighlights ?? []) {
    if (highlight.trim() === '') continue

    const key = normalize(highlight)

    const duplicatesFeature = normalizedFeatures.some((feature) => overlaps(key, feature))
    const duplicatesHighlight = seen.some((other) => overlaps(key, other))

    if (duplicatesFeature || duplicatesHighlight) {
      removed++
      continue
    }

    seen.push(key)
    highlights.push(highlight)
  }

  return { highlights, features, removed }
}
