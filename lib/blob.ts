export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const

/** Phone photos are routinely 8-12 MB, so leave real headroom. */
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024

export const MAX_IMAGES_PER_LISTING = 30

/**
 * Vercel Blob needs a store token. Without one, uploads cannot work at all —
 * so the UI checks this and explains the situation rather than presenting a
 * dropzone that fails silently on every file.
 */
export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}
