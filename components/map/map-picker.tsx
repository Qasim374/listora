'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

import type { LatLng } from './map-picker-inner'

/**
 * Leaflet touches `window` at import time, so the map must never be rendered on
 * the server. `ssr: false` keeps it out of the server bundle entirely.
 */
const MapPickerInner = dynamic(() => import('./map-picker-inner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-xl border border-sand-200 bg-sand-100">
      <p className="text-sm text-ink-muted">Loading map…</p>
    </div>
  ),
})

type SearchResult = { latitude: number; longitude: number; label: string }

export function MapPicker({
  value,
  onChange,
  addressForSearch,
}: {
  value: LatLng | null
  onChange: (value: LatLng | null) => void
  /** The address field's current value, so "Find address" needs no retyping. */
  addressForSearch: string
}) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function findAddress() {
    setMessage(null)
    setResults([])

    if (addressForSearch.trim().length < 3) {
      setMessage('Type the address above first, then search.')
      return
    }

    setSearching(true)

    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(addressForSearch)}`)
      const data = (await response.json()) as { results?: SearchResult[]; error?: string }

      if (!response.ok) {
        setMessage(data.error ?? 'Address lookup failed.')
        return
      }

      if (!data.results || data.results.length === 0) {
        setMessage('No match found. Drop the pin manually by clicking the map.')
        return
      }

      // One clear hit: place it. Several: let the agent choose, because street
      // names repeat between towns and picking the wrong one is worse than asking.
      if (data.results.length === 1) {
        onChange({
          latitude: data.results[0].latitude,
          longitude: data.results[0].longitude,
        })
        setMessage('Pin placed. Drag it to fine-tune.')
      } else {
        setResults(data.results)
      }
    } catch {
      setMessage('Address lookup failed.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={findAddress} disabled={searching} className="btn-secondary">
          {searching ? 'Searching…' : 'Find address on map'}
        </button>

        {value ? (
          <>
            <span className="text-xs text-ink-muted">
              {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
            </span>
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setMessage(null)
                setResults([])
              }}
              className="text-xs text-ink-muted hover:text-ink"
            >
              Remove pin
            </button>
          </>
        ) : (
          <span className="text-xs text-ink-muted">No pin set</span>
        )}
      </div>

      {results.length > 0 ? (
        <ul className="mt-3 divide-y divide-sand-200 overflow-hidden rounded-lg border border-sand-200">
          {results.map((result) => (
            <li key={`${result.latitude},${result.longitude}`}>
              <button
                type="button"
                onClick={() => {
                  onChange({ latitude: result.latitude, longitude: result.longitude })
                  setResults([])
                  setMessage('Pin placed. Drag it to fine-tune.')
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-ink-soft hover:bg-sand-100"
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {message ? <p className="mt-2 text-xs text-ink-muted">{message}</p> : null}

      <div className="mt-3 overflow-hidden rounded-xl border border-sand-200">
        <MapPickerInner value={value} onChange={onChange} />
      </div>

      <p className="mt-2 text-xs text-ink-muted">
        Click the map to place the pin, or drag it. This is what buyers see — set it to the actual
        entrance, not just the street.
      </p>
    </div>
  )
}

export type { LatLng }
