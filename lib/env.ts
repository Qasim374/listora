/**
 * Reads a boolean-ish environment variable tolerantly.
 *
 * Hosting dashboards are a common source of values like ` true`, `"true"` or
 * `TRUE` — pasted with a space, quoted, or capitalised. A strict `=== 'true'`
 * check treats all of those as false, which turns a configuration typo into a
 * confusing runtime error. Normalising here removes that whole class of bug.
 */
export function envFlag(value: string | undefined): boolean {
  if (!value) return false

  return ['true', '1', 'yes', 'on'].includes(
    value
      .trim()
      .toLowerCase()
      .replace(/^["']|["']$/g, ''),
  )
}
