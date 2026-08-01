'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'

import { requestPasswordReset } from '@/app/(auth)/actions'

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const data = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await requestPasswordReset({ email: String(data.get('email') ?? '') })
      if (result.ok) setSent(true)
      else setError(result.error)
    })
  }

  if (sent) {
    return (
      <div>
        <h1 className="font-display text-3xl text-brand-900">Check your email</h1>
        {/* Careful wording: we cannot say "we sent you an email" because we
            deliberately don't reveal whether the account exists. */}
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          If an account exists for that address, a reset link is on its way. It expires in one hour.
        </p>
        <p className="mt-4 text-sm text-ink-soft">
          Nothing arrived? Check the spam folder, or{' '}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-brand-600 hover:text-brand-700"
          >
            try a different address
          </button>
          .
        </p>
        <Link href="/login" className="btn-secondary mt-8">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-brand-900">Forgot your password?</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Enter your email and we&apos;ll send you a link to set a new one.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@agency.se"
            className="input"
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-accent bg-accent-soft/20 px-4 py-3 text-sm text-ink"
          >
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className="btn-primary w-full py-3">
          {pending ? 'Sending…' : 'Send reset link'}
        </button>

        <p className="pt-2 text-center text-sm text-ink-soft">
          <Link href="/login" className="text-brand-600 hover:text-brand-700">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
