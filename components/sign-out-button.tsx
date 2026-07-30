'use client'

import { useTransition } from 'react'

import { signOut } from '@/app/(auth)/actions'

export function SignOutButton() {
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => signOut())}
      className="text-sm text-ink-muted hover:text-ink"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
