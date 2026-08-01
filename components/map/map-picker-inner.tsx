'use client'

import 'leaflet/dist/leaflet.css'

import type { LeafletMouseEvent, Marker as LeafletMarker } from 'leaflet'
import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'

import { createPinIcon } from './marker-icon'

export type LatLng = { latitude: number; longitude: number }

/** Sweden's approximate centre — a sensible view before any pin is placed. */
const DEFAULT_CENTER: LatLng = { latitude: 59.3293, longitude: 18.0686 }

/** Recentres the map when the pin is moved from outside (e.g. address search). */
function Recenter({ position, zoom }: { position: LatLng | null; zoom: number }) {
  const map = useMap()

  useEffect(() => {
    if (position) map.setView([position.latitude, position.longitude], zoom)
  }, [map, position, zoom])

  return null
}

/** Clicking anywhere drops the pin there — faster than dragging across a city. */
function ClickToPlace({ onPlace }: { onPlace: (value: LatLng) => void }) {
  useMapEvents({
    click(event: LeafletMouseEvent) {
      onPlace({ latitude: event.latlng.lat, longitude: event.latlng.lng })
    },
  })

  return null
}

export default function MapPickerInner({
  value,
  onChange,
}: {
  value: LatLng | null
  onChange: (value: LatLng) => void
}) {
  const markerRef = useRef<LeafletMarker | null>(null)
  const icon = useMemo(() => createPinIcon(), [])

  const center = value ?? DEFAULT_CENTER

  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      zoom={value ? 16 : 5}
      scrollWheelZoom
      className="h-72 w-full rounded-xl"
    >
      <TileLayer
        // OpenStreetMap tiles: no API key, and no third-party cookies — unlike
        // the Google embed this replaces.
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      <Recenter position={value} zoom={16} />
      <ClickToPlace onPlace={onChange} />

      {value ? (
        <Marker
          position={[value.latitude, value.longitude]}
          icon={icon}
          draggable
          ref={markerRef}
          eventHandlers={{
            dragend() {
              const marker = markerRef.current
              if (!marker) return
              const { lat, lng } = marker.getLatLng()
              onChange({ latitude: lat, longitude: lng })
            },
          }}
        />
      ) : null}
    </MapContainer>
  )
}
