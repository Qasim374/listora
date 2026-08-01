import L from 'leaflet'

/**
 * A pin drawn with inline SVG rather than Leaflet's default image marker.
 *
 * Leaflet's default icon resolves its PNG paths relative to the CSS file, which
 * breaks under bundlers — the classic "marker is a broken image" problem. A
 * divIcon has no external assets to lose, and it lets the pin match the brand
 * colour instead of Leaflet's blue.
 */
export function createPinIcon(): L.DivIcon {
  return L.divIcon({
    className: 'listora-pin',
    // 32x42 with the point at the bottom centre, hence the anchor below.
    html: `
      <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 26 16 26s16-15 16-26C32 7.2 24.8 0 16 0z" fill="#155448"/>
        <circle cx="16" cy="15.5" r="6" fill="#F5F1EA"/>
      </svg>`,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
  })
}
