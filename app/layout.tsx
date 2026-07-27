import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
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
