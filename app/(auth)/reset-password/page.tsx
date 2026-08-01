import Link from 'next/link'

import { ResetPasswordForm } from '@/components/reset-password-form'
import { checkResetToken } from '@/lib/auth/reset-tokens'

export const metadata = { title: 'Set a new password' }
export const dynamic = 'force-dynamic'

type PageProps = { searchParams: Promise<{ token?: string }> }

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const { token } = await searchParams

  // Checked before rendering the form so an expired link says so immediately,
  // rather than after the agent has typed a new password twice.
  const check = await checkResetToken(token)

  if (!check.valid) {
    return (
      <div>
        <h1 className="font-display text-3xl text-brand-900">Link not valid</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{check.reason}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/forgot-password" className="btn-primary">
            Request a new link
          </Link>
          <Link href="/login" className="btn-secondary">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-brand-900">Set a new password</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Choose something you haven&apos;t used elsewhere. You&apos;ll be signed in straight away.
      </p>

      <ResetPasswordForm token={token as string} />
    </div>
  )
}
