import { redirect } from 'next/navigation'

import { AuthForm } from '@/components/auth-form'
import { getCurrentAgent } from '@/lib/auth/current-agent'

export const metadata = { title: 'Sign in' }
export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  // Already signed in? Don't show a login form.
  if (await getCurrentAgent()) redirect('/dashboard')

  return (
    <div>
      <h1 className="font-display text-3xl text-brand-900">Sign in</h1>
      <p className="mt-2 text-sm text-ink-soft">Welcome back.</p>

      <div className="mt-8">
        <AuthForm mode="signin" />
      </div>
    </div>
  )
}
