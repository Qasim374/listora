import Link from 'next/link'

export default function ListingNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl text-brand-900">Listing not available</h1>
        <p className="mt-3 text-ink-soft">
          This listing may have been removed, or the link is incomplete. Check the link with
          whoever sent it to you.
        </p>
        <Link href="/" className="btn-secondary mt-8">
          Go to Listora
        </Link>
      </div>
    </main>
  )
}
