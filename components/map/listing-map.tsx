'use client'

import dynamic from 'next/dynamic'

/**
 * Read-only map for the public listing page.
 *
 * Separate from MapPicker so the buyer-facing bundle carries no dragging,
 * geocoding or search code — only what's needed to show one pin.
 */
const ListingMapInner = dynamic(() => import('./listing-map-inner'), {
  ssr: false,
  loading: () => <div className="h-64 w-full bg-sand-200/60" />,
})

export function ListingMap({
  latitude,
  longitude,
  label,
}: {
  latitude: number
  longitude: number
  label: string
}) {
  return <ListingMapInner latitude={latitude} longitude={longitude} label={label} />
}
