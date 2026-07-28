import Link from 'next/link'

/**
 * Marketing landing page — placeholder hero for now.
 * The full page (how-it-works, pricing, testimonials) is step 9.
 */
export default function MarketingHomePage() {
  return (
    <main>
      <header className="mx-auto flex max-w-content items-center justify-between px-6 py-6">
        <span className="font-display text-xl tracking-tight text-brand-800">Listora</span>
        <Link href="/dashboard" className="btn-secondary">
          Go to dashboard
        </Link>
      </header>

      <section className="mx-auto max-w-content px-6 pb-24 pt-16 sm:pt-24">
        <p className="text-sm font-medium uppercase tracking-widest text-accent">
          For estate agents
        </p>

        <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight text-brand-900 sm:text-6xl">
          Photos in. A listing page buyers actually read, out.
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
          Drop in your photos and a few rough notes about the property. Listora writes the headline,
          the description and the highlights, then gives you a link to send to buyers. Edit anything
          before you publish.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/dashboard" className="btn-primary">
            Create a listing
          </Link>
          <Link href="#how-it-works" className="btn-secondary">
            See how it works
          </Link>
        </div>

        <p className="mt-6 text-sm text-ink-muted">
          No card required. Your first three listings are free.
        </p>
      </section>
    </main>
  )
}
