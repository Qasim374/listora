'use client'

import { useState, useTransition } from 'react'

import { resetPassword } from '@/app/(auth)/actions'

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    const data = new FormData(event.currentTarget)
    const password = String(data.get('password') ?? '')
    const confirm = String(data.get('confirm') ?? '')

    // Checked here rather than server-side: it's a typo guard for the person
    // typing, not a security rule, and instant feedback is better UX.
    if (password !== confirm) {
      setFieldErrors({ confirm: 'The two passwords do not match' })
      return
    }

    startTransition(async () => {
      const result = await resetPassword({ token, password })
      if (result && !result.ok) {
        setError(result.error)
        setFieldErrors(result.fieldErrors ?? {})
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div>
        <label htmlFor="password" className="label">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="input"
        />
        {fieldErrors.password ? (
          <p className="mt-1.5 text-sm text-accent">{fieldErrors.password}</p>
        ) : (
          <p className="mt-1.5 text-xs text-ink-muted">At least 10 characters.</p>
        )}
      </div>

      <div>
        <label htmlFor="confirm" className="label">
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="input"
        />
        {fieldErrors.confirm ? (
          <p className="mt-1.5 text-sm text-accent" role="alert">
            {fieldErrors.confirm}
          </p>
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
        {pending ? 'Saving…' : 'Set new password'}
      </button>
    </form>
  )
}
