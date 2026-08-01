/**
 * Buyer's saved listings, kept in the browser.
 *
 * Deliberately not a database table behind a buyer account: the product's promise
 * is that a buyer opening a shared link needs no login, and putting a signup form
 * behind the ♥ would lose most of the people who tap it. The trade-off — the list
 * doesn't follow them to another device — is accepted and stated in the UI.
 *
 * Every read defends against corrupt data. localStorage is user-writable and
 * survives deploys, so a value written by an older version (or by hand) must
 * never throw on a buyer's page.
 */
const STORAGE_KEY = 'listora:saved-listings'

/** Enough for any realistic shortlist; stops unbounded growth. */
const MAX_SAVED = 100

/** Fired after every change so open components re-read without a page reload. */
export const SAVED_CHANGED_EVENT = 'listora:saved-changed'

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readSaved(): string[] {
  if (!isBrowser()) return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    // Keep only plausible slugs, de-duplicated
    return Array.from(
      new Set(
        parsed.filter(
          (value): value is string =>
            typeof value === 'string' && value.length > 0 && value.length <= 200,
        ),
      ),
    ).slice(0, MAX_SAVED)
  } catch {
    // Malformed JSON, or storage blocked (Safari private mode throws on access)
    return []
  }
}

function write(slugs: string[]): void {
  if (!isBrowser()) return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs.slice(0, MAX_SAVED)))
    window.dispatchEvent(new Event(SAVED_CHANGED_EVENT))
  } catch {
    // Quota exceeded or storage disabled — saving simply doesn't persist, which
    // is preferable to breaking the listing page.
  }
}

export function isSaved(slug: string): boolean {
  return readSaved().includes(slug)
}

/** Adds or removes, returning the new saved state for that slug. */
export function toggleSaved(slug: string): boolean {
  const current = readSaved()

  if (current.includes(slug)) {
    write(current.filter((value) => value !== slug))
    return false
  }

  // Newest first, so the Saved page shows recent interest at the top
  write([slug, ...current])
  return true
}

export function removeSaved(slug: string): void {
  write(readSaved().filter((value) => value !== slug))
}
