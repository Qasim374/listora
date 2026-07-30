import { envFlag } from '../lib/env'

/* eslint-disable no-console */

/** The messy values a hosting dashboard actually produces. */
const CASES: Array<[string | undefined, boolean]> = [
  ['true', true],
  [' true', true],
  ['true ', true],
  ['TRUE', true],
  ['True', true],
  ['"true"', true],
  ["'true'", true],
  ['1', true],
  ['yes', true],
  ['false', false],
  ['', false],
  [undefined, false],
  ['0', false],
  ['nope', false],
]

console.log('\nenvFlag:\n')

let failures = 0

for (const [input, expected] of CASES) {
  const actual = envFlag(input)
  const pass = actual === expected
  if (!pass) failures++
  console.log(
    `  ${JSON.stringify(input ?? null).padEnd(10)} -> ${String(actual).padEnd(5)} ${pass ? 'ok' : `FAIL (expected ${expected})`}`,
  )
}

console.log(`\n  ${CASES.length - failures}/${CASES.length} passed\n`)
if (failures > 0) process.exitCode = 1
