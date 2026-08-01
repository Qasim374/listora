import { splitHighlightsAndFeatures } from '../lib/listing-content'
import { parseVideoUrl } from '../lib/video'

/* eslint-disable no-console */

let failures = 0
const check = (label: string, pass: boolean, detail = '') => {
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`)
}

console.log('\nHighlights / Features dedup\n')

// The real overlap from the demo listing
const features = [
  'South-west facing balcony',
  'Renovated kitchen (2021)',
  'Lift in building',
  'Original parquet flooring',
  'Storage room in basement',
]

const overlapping = splitHighlightsAndFeatures(
  [
    'South-west facing balcony',
    'Renovated kitchen', // near-duplicate: parenthetical year dropped
    'Lift in building',
    'Top-floor corner position means no footsteps overhead',
  ],
  features,
)
check(
  'duplicates dropped from highlights',
  overlapping.highlights.length === 1 && overlapping.removed === 3,
  `-> kept ${JSON.stringify(overlapping.highlights)}`,
)
check(
  'features left untouched',
  overlapping.features.length === 5,
  'the agent-typed list must never lose items',
)

const distinct = splitHighlightsAndFeatures(
  ['Afternoon sun lasts until dinner', 'Nothing to budget for on day one'],
  features,
)
check('genuinely distinct highlights kept', distinct.highlights.length === 2)

const selfDupe = splitHighlightsAndFeatures(
  ['Lift in building', 'Lift in building', 'lift in building'],
  [],
)
check('highlights deduped against each other', selfDupe.highlights.length === 1)

check('blank entries dropped', splitHighlightsAndFeatures(['', '  '], ['']).highlights.length === 0)
check('null input safe', splitHighlightsAndFeatures(null, null).features.length === 0)
check(
  'short words are not treated as duplicates',
  splitHighlightsAndFeatures(['Pool'], ['Poolhouse nearby']).highlights.length === 1,
  '"Pool" must not be swallowed by "Poolhouse nearby"',
)

console.log('\nVideo URL parsing\n')

const cases: Array<[string, string | null]> = [
  ['https://www.youtube.com/watch?v=abc123', 'https://www.youtube.com/embed/abc123'],
  ['https://youtu.be/abc123', 'https://www.youtube.com/embed/abc123'],
  ['youtube.com/watch?v=abc123', 'https://www.youtube.com/embed/abc123'],
  ['https://www.youtube.com/shorts/abc123', 'https://www.youtube.com/embed/abc123'],
  ['https://www.youtube.com/watch?v=abc123&list=PL9&t=30s', 'https://www.youtube.com/embed/abc123'],
  ['https://vimeo.com/123456789', 'https://player.vimeo.com/video/123456789'],
  ['https://vimeo.com/channels/staffpicks/123456789', 'https://player.vimeo.com/video/123456789'],
  ['https://example.com/video.mp4', null],
  ['not a url at all', null],
  ['', null],
]

for (const [input, expected] of cases) {
  const actual = parseVideoUrl(input)?.embedUrl ?? null
  check(
    `${(input || '(empty)').slice(0, 46).padEnd(48)} -> ${actual ?? 'null'}`,
    actual === expected,
    actual === expected ? '' : `expected ${expected ?? 'null'}`,
  )
}

console.log(`\n  ${failures === 0 ? 'all checks passed' : `${failures} FAILED`}\n`)
if (failures > 0) process.exitCode = 1
