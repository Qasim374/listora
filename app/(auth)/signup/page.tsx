import { redirect } from 'next/navigation'

import { AuthForm } from '@/components/auth-form'
import { getCurrentAgent } from '@/lib/auth/current-agent'
import { PLANS } from '@/lib/plans'

export const metadata = { title: 'Create your account' }
export const dynamic = 'force-dynamic'

export default async function SignUpPage() {
  if (await getCurrentAgent()) redirect('/dashboard')

  return (
    <div>
      <h1 className="font-display text-3xl text-brand-900">Create your account</h1>
      <p className="mt-2 text-sm text-ink-soft">
        {PLANS.free.listingLimit} listings free. No card required.
      </p>

      <div className="mt-8">
        <AuthForm mode="signup" />
      </div>
    </div>
  )
}
