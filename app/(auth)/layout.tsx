import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-sand-100">
      <header className="border-b border-sand-200">
        <div className="mx-auto flex max-w-content items-center px-6 py-4">
          <Link href="/" className="font-display text-xl tracking-tight text-brand-800">
            Listora
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  )
}
