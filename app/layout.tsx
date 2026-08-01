import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  /**
   * Required for relative URLs in openGraph/canonical to resolve.
   *
   * og:image and og:url must be absolute — a scraper has no page context to
   * resolve "/listing/x" against. Without this, Next warns and emits localhost
   * URLs in production, so shared links would preview nothing.
   */
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Listora — Property listings that sell themselves',
    template: '%s · Listora',
  },
  description:
    'Upload your photos and a few rough notes. Listora turns them into a polished listing page with a link you can send to buyers in seconds.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
