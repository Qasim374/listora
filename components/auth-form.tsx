'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'

import { signIn, signUp } from '@/app/(auth)/actions'

export function AuthForm({ mode }: { mode: 'signin' | 'signup' }) {
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  const signingUp = mode === 'signup'

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    const data = new FormData(event.currentTarget)
    const payload = signingUp
      ? {
          name: String(data.get('name') ?? ''),
          email: String(data.get('email') ?? ''),
          password: String(data.get('password') ?? ''),
        }
      : {
          email: String(data.get('email') ?? ''),
          password: String(data.get('password') ?? ''),
        }

    startTransition(async () => {
      // On success the action redirects, so nothing is returned.
      const result = signingUp ? await signUp(payload) : await signIn(payload)

      if (result && !result.ok) {
        setError(result.error)
        setFieldErrors(result.fieldErrors ?? {})
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {signingUp ? (
        <div>
          <label htmlFor="name" className="label">
            Your name
          </label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            placeholder="Anna Lindberg"
            className="input"
          />
          {fieldErrors.name ? <FieldError message={fieldErrors.name} /> : null}
        </div>
      ) : null}

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
        {fieldErrors.email ? <FieldError message={fieldErrors.email} /> : null}
      </div>

      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          // new-password tells the browser to offer a generated one on signup,
          // and stops it autofilling the wrong saved credential.
          autoComplete={signingUp ? 'new-password' : 'current-password'}
          required
          minLength={signingUp ? 10 : undefined}
          className="input"
        />
        {fieldErrors.password ? (
          <FieldError message={fieldErrors.password} />
        ) : signingUp ? (
          <p className="mt-1.5 text-xs text-ink-muted">At least 10 characters.</p>
        ) : null}
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
        {pending ? 'Please wait…' : signingUp ? 'Create account' : 'Sign in'}
      </button>

      <p className="pt-2 text-center text-sm text-ink-soft">
        {signingUp ? (
          <>
            Already have an account?{' '}
            <Link href="/login" className="text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to Listora?{' '}
            <Link href="/signup" className="text-brand-600 hover:text-brand-700">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  )
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="mt-1.5 text-sm text-accent" role="alert">
      {message}
    </p>
  )
}
