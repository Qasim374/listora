export type ImageInput = { url: string; isCover: boolean; isFloorPlan: boolean }

/**
 * Builds listing_images rows, guaranteeing exactly one cover photo.
 *
 * Lives here rather than in a server-action file because every export from a
 * 'use server' module must be an async action — a plain helper exported from one
 * is a build error.
 *
 * The cover must be a photo, never a floor plan: it's what appears in the link
 * preview when an agent shares the listing, and a diagram makes a poor first
 * impression. If the agent marked everything as a floor plan, no cover is set
 * rather than promoting a plan. The partial unique index would reject two.
 */
export function buildImageRows(listingId: string, images: ImageInput[]) {
  const photos = images
    .map((image, index) => ({ image, index }))
    .filter(({ image }) => !image.isFloorPlan)

  const chosen = photos.find(({ image }) => image.isCover) ?? photos[0]

  return images.map((image, index) => ({
    listingId,
    url: image.url,
    sortOrder: index,
    isCover: chosen !== undefined && index === chosen.index,
    isFloorPlan: image.isFloorPlan,
  }))
}
