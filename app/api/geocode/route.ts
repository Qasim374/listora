import { getCurrentAgent } from '@/lib/auth/current-agent'

/**
 * Proxies address lookups to OpenStreetMap's Nominatim.
 *
 * Why a proxy rather than calling Nominatim from the browser:
 *   - Their usage policy requires a identifying User-Agent, and browsers refuse
 *     to let JavaScript set that header.
 *   - It keeps the agent's typed address out of a third party's referer logs.
 *   - It lets us require a signed-in agent, so this can't be used as a free
 *     public geocoding service by anyone who finds the URL.
 *
 * Nominatim asks for no more than 1 request per second. This is only hit when an
 * agent clicks "Find address", so that's comfortably respected in practice.
 */
export async function GET(request: Request): Promise<Response> {
  const agent = await getCurrentAgent()

  if (!agent) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const query = new URL(request.url).searchParams.get('q')?.trim()

  if (!query || query.length < 3) {
    return Response.json({ error: 'Enter an address to search for' }, { status: 400 })
  }

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '5')
  url.searchParams.set('addressdetails', '1')

  try {
    const response = await fetch(url, {
      headers: {
        // Required by Nominatim's policy: identify the application.
        'user-agent': 'Listora/1.0 (real estate listing tool)',
        'accept-language': 'sv,en',
      },
      // Same address searched twice in a session shouldn't hit them twice.
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      return Response.json({ error: 'Address lookup is unavailable' }, { status: 502 })
    }

    const raw = (await response.json()) as Array<{
      lat: string
      lon: string
      display_name: string
    }>

    return Response.json({
      results: raw.map((item) => ({
        latitude: Number(item.lat),
        longitude: Number(item.lon),
        label: item.display_name,
      })),
    })
  } catch (error) {
    console.error('Geocode lookup failed', error)
    return Response.json({ error: 'Address lookup is unavailable' }, { status: 502 })
  }
}
