import Link from 'next/link'

import { SavedListingsPage } from '@/components/saved-listings-page'

export const metadata = {
  title: 'Saved properties',
  // Nothing here is useful to a search engine, and the page is personal.
  robots: { index: false, follow: false },
}

export default function SavedPage() {
  return (
    <main className="min-h-screen bg-sand-100">
      <header className="border-b border-sand-200 bg-sand-50">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-display text-lg tracking-tight text-brand-800">
            Listora
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-3xl text-brand-900">Saved properties</h1>
        {/* Said plainly, because the limitation is real and surprising otherwise */}
        <p className="mt-2 max-w-xl text-sm text-ink-soft">
          Kept on this device only, so they won&apos;t appear on your other phone or computer, and
          they&apos;re cleared if you wipe your browser data.
        </p>

        <div className="mt-8">
          <SavedListingsPage />
        </div>
      </div>
    </main>
  )
}
