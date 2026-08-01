/**
 * Turns a pasted YouTube or Vimeo link into an embeddable URL.
 *
 * Agents paste whatever the browser gave them — a watch URL, a share link, a
 * youtu.be short link, sometimes with a playlist or timestamp attached. Rather
 * than asking them to find an "embed code", we extract the id ourselves.
 *
 * Returns null for anything unrecognised, so the caller can show a clear error
 * instead of rendering an iframe that silently fails.
 */
export type VideoEmbed = {
  provider: 'youtube' | 'vimeo'
  embedUrl: string
}

export function parseVideoUrl(raw: string | null | undefined): VideoEmbed | null {
  if (!raw) return null

  const trimmed = raw.trim()
  if (trimmed === '') return null

  let url: URL

  try {
    // Tolerate a missing scheme — "youtube.com/watch?v=..." is a common paste
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase()

  // youtu.be/<id>
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0]
    return id ? { provider: 'youtube', embedUrl: `https://www.youtube.com/embed/${id}` } : null
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    // /watch?v=<id>
    const v = url.searchParams.get('v')
    if (v) return { provider: 'youtube', embedUrl: `https://www.youtube.com/embed/${v}` }

    // /embed/<id>, /shorts/<id>, /live/<id>
    const match = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?]+)/)
    if (match) return { provider: 'youtube', embedUrl: `https://www.youtube.com/embed/${match[1]}` }

    return null
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    // Vimeo ids are numeric; grab the first numeric path segment so that
    // /channels/foo/123456 and /123456/abcdef both work.
    const id = url.pathname.split('/').find((segment) => /^\d+$/.test(segment))
    return id ? { provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${id}` } : null
  }

  return null
}
