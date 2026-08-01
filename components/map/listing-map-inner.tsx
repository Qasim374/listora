'use client'

import 'leaflet/dist/leaflet.css'

import { useMemo } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'

import { createPinIcon } from './marker-icon'

export default function ListingMapInner({
  latitude,
  longitude,
  label,
}: {
  latitude: number
  longitude: number
  label: string
}) {
  const icon = useMemo(() => createPinIcon(), [])

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={16}
      // Wheel-zoom off: buyers scroll past this map on the way down the page, and
      // hijacking the scroll to zoom is a well-earned annoyance. Buttons and
      // pinch still work.
      scrollWheelZoom={false}
      className="h-64 w-full"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={[latitude, longitude]} icon={icon}>
        <Popup>{label}</Popup>
      </Marker>
    </MapContainer>
  )
}
