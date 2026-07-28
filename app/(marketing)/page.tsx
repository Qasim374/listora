import Link from 'next/link'

import { PLANS, PLAN_ORDER } from '@/lib/plans'
import { formatPrice } from '@/lib/utils'

export const metadata = {
  title: 'Listora — Property listings that sell themselves',
}

const STEPS = [
  {
    number: '01',
    title: 'Drop in your photos',
    body: 'Drag in whatever you shot on your phone. They upload straight from the browser, so a dozen full-size photos take seconds.',
  },
  {
    number: '02',
    title: 'Type rough notes',
    body: 'Half sentences are fine. "Top floor, kitchen redone last year, balcony faces south-west, lift installed 2019." That is enough.',
  },
  {
    number: '03',
    title: 'Read it back, then publish',
    body: 'You get a headline, a description and highlights. Change any word before it goes live — nothing publishes until you say so.',
  },
  {
    number: '04',
    title: 'Send one link',
    body: 'A clean page that works on any phone, no login for the buyer. Copy the link into an email, an SMS or WhatsApp.',
  },
]

const FEATURES = [
  {
    title: 'It will not invent features',
    body: 'Every detail traces back to something you typed. No phantom kitchen islands, no imagined schools nearby — the sort of claim that costs you trust in a viewing.',
  },
  {
    title: 'It catches your typos',
    body: 'Enter 3 bedrooms and 23 m² and Listora asks before an AI confidently calls a family home compact.',
  },
  {
    title: 'Buyers see monthly cost',
    body: 'Interest, amortisation and the monthly fee, using the Swedish amortisation requirement — so buyers judge the real number, not just the asking price.',
  },
  {
    title: 'You see who looked',
    body: 'A view count per listing that filters out crawlers, so one WhatsApp message does not read as three interested buyers.',
  },
  {
    title: 'Your inbox stays yours',
    body: 'Contact details load only when a buyer asks for them, so they are never sitting in the page for spam bots to harvest.',
  },
  {
    title: 'Edit anything, any time',
    body: 'Price change, new photos, better wording. The link you already sent keeps working — it never changes underneath you.',
  },
]

const FAQS = [
  {
    q: 'Does it write things that are not true?',
    a: 'It is built specifically not to. The AI only receives the facts and notes you enter, and is instructed that every concrete detail must trace back to them. You also read and edit everything before publishing.',
  },
  {
    q: 'Do buyers need an account?',
    a: 'No. They open the link and see the property. No sign-up, no app, nothing to install.',
  },
  {
    q: 'Can I change the copy it writes?',
    a: 'Yes — headline, description and every highlight are editable, and you can regenerate from scratch as often as you like.',
  },
  {
    q: 'What happens if I cancel?',
    a: 'Your published links keep working until the end of the period you paid for. You can export nothing and lose nothing by trying it.',
  },
]

export default function MarketingHomePage() {
  return (
    <div className="bg-sand-100">
      {/* ------------------------------------------------------------------ nav */}
      <header className="sticky top-0 z-40 border-b border-sand-200/80 bg-sand-100/90 backdrop-blur">
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
          <span className="font-display text-xl tracking-tight text-brand-800">Listora</span>
          <nav className="flex items-center gap-6">
            <Link href="#how" className="hidden text-sm text-ink-soft hover:text-ink sm:block">
              How it works
            </Link>
            <Link href="#pricing" className="hidden text-sm text-ink-soft hover:text-ink sm:block">
              Pricing
            </Link>
            <Link href="/dashboard" className="btn-primary">
              Open dashboard
            </Link>
          </nav>
        </div>
      </header>

      {/* ---------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-content gap-12 px-6 py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-24">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-accent">
              For estate agents
            </p>

            <h1 className="mt-4 font-display text-4xl leading-[1.1] text-brand-900 sm:text-5xl lg:text-6xl">
              Photos in. A listing page buyers actually read, out.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              Drop in your photos and a few rough notes. Listora writes the headline, the
              description and the highlights, then gives you one link to send to buyers. You edit
              anything you like before it goes live.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/dashboard" className="btn-primary px-6 py-3 text-base">
                Create your first listing
              </Link>
              <Link href="#how" className="btn-secondary px-6 py-3 text-base">
                See how it works
              </Link>
            </div>

            <p className="mt-5 text-sm text-ink-muted">
              Three listings free. No card, no trial timer.
            </p>
          </div>

          {/* A mock of the real output, built in markup — no screenshot to go
              stale, and it renders sharp at any size. */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-brand-800/5" aria-hidden />
            <div className="relative overflow-hidden rounded-2xl border border-sand-300 bg-sand-50 shadow-xl">
              <div className="flex items-center gap-1.5 border-b border-sand-200 bg-sand-200/60 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-sand-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-sand-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-sand-300" />
                <span className="ml-2 truncate font-mono text-[11px] text-ink-muted">
                  listora.se/listing/storgatan-14
                </span>
              </div>

              <div className="h-36 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800" />

              <div className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-700">
                    For sale
                  </span>
                  <span className="rounded-full bg-sand-200 px-2 py-0.5 text-[10px] text-ink-soft">
                    Apartment
                  </span>
                </div>

                <p className="mt-3 font-display text-lg leading-snug text-brand-900">
                  A top-floor corner apartment where the afternoon light lasts until dinner
                </p>

                <p className="mt-2 text-xl font-medium text-brand-700">7 450 000 kr</p>

                <div className="mt-4 space-y-1.5">
                  {[
                    'South-west facing balcony',
                    'Renovated kitchen (2021)',
                    'Lift in building',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-ink-soft">
                      <span className="h-1 w-1 rounded-full bg-accent" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- before / after */}
      <section className="border-y border-sand-200 bg-sand-50">
        <div className="mx-auto max-w-content px-6 py-16">
          <h2 className="font-display text-3xl text-brand-900">What you type, what you get</h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Twenty words of notes is a normal amount to give it.
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-sand-300 bg-sand-100 p-6">
              <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                Your notes
              </p>
              <p className="mt-4 font-mono text-sm leading-relaxed text-ink-soft">
                top floor, 3 rooms, kitchen redone last year, balcony faces south-west, 1928
                building with lift, 5 min walk to metro
              </p>
            </div>

            <div className="rounded-xl border border-brand-200 bg-brand-50 p-6">
              <p className="text-xs font-medium uppercase tracking-widest text-brand-600">
                What buyers read
              </p>
              <p className="mt-4 font-display text-lg leading-snug text-brand-900">
                A top-floor corner apartment where the afternoon light lasts until dinner
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Set on the top floor of a 1928 building, this apartment collects light from two
                directions — and the south-west balcony holds the afternoon and evening sun. The
                kitchen was rebuilt last year, so there is nothing to budget for on day one…
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- how it works */}
      <section id="how" className="mx-auto max-w-content scroll-mt-20 px-6 py-16 lg:py-24">
        <h2 className="font-display text-3xl text-brand-900">How it works</h2>
        <p className="mt-3 max-w-2xl text-ink-soft">
          Four steps, about two minutes from photos to a link you can send.
        </p>

        <ol className="mt-10 grid gap-8 sm:grid-cols-2">
          {STEPS.map((step) => (
            <li key={step.number} className="flex gap-5">
              <span className="font-display text-2xl text-brand-300">{step.number}</span>
              <div>
                <h3 className="font-medium text-ink">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* --------------------------------------------------------------- features */}
      <section className="border-y border-sand-200 bg-sand-50">
        <div className="mx-auto max-w-content px-6 py-16 lg:py-24">
          <h2 className="font-display text-3xl text-brand-900">
            Built for the part that actually worries you
          </h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            An AI that makes things up is worse than no AI at all. Most of the work here went into
            making sure it does not.
          </p>

          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title}>
                <h3 className="font-medium text-ink">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- pricing */}
      <section id="pricing" className="mx-auto max-w-content scroll-mt-20 px-6 py-16 lg:py-24">
        <h2 className="font-display text-3xl text-brand-900">Pricing</h2>
        <p className="mt-3 max-w-2xl text-ink-soft">
          Priced per month, by how many listings you publish. Cancel whenever.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {PLAN_ORDER.map((planId) => {
            const plan = PLANS[planId]
            const highlighted = planId === 'starter'

            return (
              <div
                key={plan.id}
                className={
                  highlighted
                    ? 'relative rounded-2xl border-2 border-brand-500 bg-sand-50 p-6 shadow-md'
                    : 'rounded-2xl border border-sand-300 bg-sand-50 p-6'
                }
              >
                {highlighted ? (
                  <span className="absolute -top-3 left-6 rounded-full bg-brand-700 px-3 py-0.5 text-xs font-medium text-sand-50">
                    Most agents pick this
                  </span>
                ) : null}

                <h3 className="font-display text-xl text-brand-900">{plan.name}</h3>

                <p className="mt-3">
                  <span className="font-display text-4xl text-brand-800">
                    {plan.price === 0 ? 'Free' : formatPrice(plan.price)}
                  </span>
                  {plan.price > 0 ? <span className="text-sm text-ink-muted"> / month</span> : null}
                </p>

                <p className="mt-2 text-sm text-ink-muted">
                  {plan.listingLimit} listings per month
                </p>

                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-ink-soft">
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand-500"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/dashboard"
                  className={highlighted ? 'btn-primary mt-8 w-full' : 'btn-secondary mt-8 w-full'}
                >
                  {plan.price === 0 ? 'Start free' : `Choose ${plan.name}`}
                </Link>
              </div>
            )
          })}
        </div>

        <p className="mt-6 text-sm text-ink-muted">
          Card payments are not switched on yet — every plan currently runs in free mode while we
          finish billing.
        </p>
      </section>

      {/* ------------------------------------------------------------ testimonials */}
      <section className="border-y border-sand-200 bg-brand-800">
        <div className="mx-auto max-w-content px-6 py-16">
          <p className="text-xs font-medium uppercase tracking-widest text-brand-200">
            From agents using it
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            {[1, 2, 3].map((slot) => (
              <figure key={slot} className="border-l-2 border-brand-500 pl-5">
                <blockquote className="font-display text-lg leading-snug text-sand-100/40">
                  Quote from a real agent goes here once we have permission to use it.
                </blockquote>
                <figcaption className="mt-3 text-sm text-brand-200/50">
                  Name · Agency · City
                </figcaption>
              </figure>
            ))}
          </div>

          <p className="mt-8 text-sm text-brand-200/70">
            Left deliberately empty. We would rather show nothing than invent praise.
          </p>
        </div>
      </section>

      {/* -------------------------------------------------------------------- faq */}
      <section className="mx-auto max-w-content px-6 py-16 lg:py-24">
        <h2 className="font-display text-3xl text-brand-900">Questions</h2>

        <dl className="mt-8 max-w-3xl divide-y divide-sand-200">
          {FAQS.map((faq) => (
            <div key={faq.q} className="py-5">
              <dt className="font-medium text-ink">{faq.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-ink-soft">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ------------------------------------------------------------------- cta */}
      <section className="border-t border-sand-200 bg-sand-50">
        <div className="mx-auto max-w-content px-6 py-16 text-center">
          <h2 className="font-display text-3xl text-brand-900 sm:text-4xl">
            Your next listing could take two minutes
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-ink-soft">
            Photos, a few notes, one link. Three listings free to see whether the writing is any
            good.
          </p>
          <Link href="/dashboard" className="btn-primary mt-8 px-6 py-3 text-base">
            Create your first listing
          </Link>
        </div>
      </section>

      {/* ---------------------------------------------------------------- footer */}
      <footer className="border-t border-sand-200">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-4 px-6 py-8">
          <span className="font-display text-lg text-brand-800">Listora</span>
          <p className="text-sm text-ink-muted">
            Listing pages for estate agents. Built in Sweden.
          </p>
        </div>
      </footer>
    </div>
  )
}
