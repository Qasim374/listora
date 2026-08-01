'use client'

import { upload } from '@vercel/blob/client'
import { useState, useTransition } from 'react'

import { updateAgentProfile } from '@/app/(dashboard)/dashboard/settings/actions'
import { AgentCard } from '@/components/agent-card'
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '@/lib/blob'
import { market, MARKET_IDS } from '@/lib/markets'

type Props = {
  uploadsEnabled: boolean
  initial: {
    name: string
    email: string
    market: string
    phone: string | null
    brokerageName: string | null
    brokerageLogoUrl: string | null
    licenseNumber: string | null
    headshotUrl: string | null
  }
}

export function AgentProfileForm({ uploadsEnabled, initial }: Props) {
  const [name, setName] = useState(initial.name)
  const [marketId, setMarketId] = useState(initial.market)
  const [brokerageName, setBrokerageName] = useState(initial.brokerageName ?? '')
  const [licenseNumber, setLicenseNumber] = useState(initial.licenseNumber ?? '')
  const [headshotUrl, setHeadshotUrl] = useState(initial.headshotUrl ?? '')
  const [brokerageLogoUrl, setBrokerageLogoUrl] = useState(initial.brokerageLogoUrl ?? '')

  const [uploading, setUploading] = useState<null | 'headshot' | 'logo'>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  async function uploadImage(kind: 'headshot' | 'logo', file: File) {
    setError(null)

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      setError(`${file.name} isn't a JPEG, PNG, WebP or AVIF image.`)
      return
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError(`${file.name} is larger than ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB.`)
      return
    }

    setUploading(kind)

    try {
      const result = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/blob/upload',
      })

      if (kind === 'headshot') setHeadshotUrl(result.url)
      else setBrokerageLogoUrl(result.url)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(null)
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    setSaved(false)

    const data = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await updateAgentProfile({
        name,
        market: marketId,
        phone: String(data.get('phone') ?? ''),
        brokerageName,
        licenseNumber,
        headshotUrl,
        brokerageLogoUrl,
      })

      if (!result.ok) {
        setError(result.error)
        setFieldErrors(result.fieldErrors ?? {})
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="label">
            Your name
          </label>
          <input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="input"
          />
          {fieldErrors.name ? (
            <p className="mt-1.5 text-sm text-accent">{fieldErrors.name}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input id="email" value={initial.email} disabled readOnly className="input opacity-60" />
          <p className="mt-1.5 text-xs text-ink-muted">
            This is your sign-in address, so it can&apos;t be changed here yet.
          </p>
        </div>

        <div>
          <span className="label">Your market</span>
          <p className="mt-0.5 text-xs text-ink-muted">
            The default for new listings. Each listing keeps its own, so changing this never alters
            prices on listings you already published.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MARKET_IDS.map((id) => {
              const option = market(id)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMarketId(id)}
                  className={
                    id === marketId
                      ? 'rounded-lg border border-brand-500 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-800'
                      : 'rounded-lg border border-sand-300 bg-sand-50 px-4 py-2 text-sm text-ink-soft hover:bg-sand-100'
                  }
                >
                  {option.label}
                  <span className="ml-2 text-xs text-ink-muted">{option.currency}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="phone" className="label">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={initial.phone ?? ''}
              placeholder={market(marketId).phonePlaceholder}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="licenseNumber" className="label">
              {market(marketId).licenseLabel}
            </label>
            <input
              id="licenseNumber"
              value={licenseNumber}
              onChange={(event) => setLicenseNumber(event.target.value)}
              className="input"
            />
          </div>
        </div>

        <div>
          <label htmlFor="brokerageName" className="label">
            Agency name
          </label>
          <input
            id="brokerageName"
            value={brokerageName}
            onChange={(event) => setBrokerageName(event.target.value)}
            placeholder="Lindberg Fastighetsbyrå"
            className="input"
          />
        </div>

        {uploadsEnabled ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <ImagePicker
              label="Your photo"
              current={headshotUrl}
              busy={uploading === 'headshot'}
              onPick={(file) => void uploadImage('headshot', file)}
              onClear={() => setHeadshotUrl('')}
            />
            <ImagePicker
              label="Agency logo"
              current={brokerageLogoUrl}
              busy={uploading === 'logo'}
              onPick={(file) => void uploadImage('logo', file)}
              onClear={() => setBrokerageLogoUrl('')}
            />
          </div>
        ) : (
          <p className="rounded-lg border border-accent-soft bg-accent-soft/20 px-4 py-3 text-sm text-ink-soft">
            Image uploads need <code className="font-mono text-xs">BLOB_READ_WRITE_TOKEN</code>{' '}
            configured.
          </p>
        )}

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-accent bg-accent-soft/20 px-4 py-3 text-sm text-ink"
          >
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending || uploading !== null} className="btn-primary">
            {pending ? 'Saving…' : 'Save profile'}
          </button>
          {saved ? <span className="text-sm text-brand-600">Profile saved.</span> : null}
        </div>
      </form>

      {/* Live preview of exactly what buyers see, so the agent isn't guessing */}
      <aside>
        <p className="label">How buyers see you</p>
        <div className="card mt-2">
          <AgentCard
            agent={{
              name: name || 'Your name',
              headshotUrl: headshotUrl || null,
              brokerageName: brokerageName || null,
              brokerageLogoUrl: brokerageLogoUrl || null,
              licenseNumber: licenseNumber || null,
            }}
          />
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Your email and phone are never shown on the listing page — buyers reach you through the
          enquiry form.
        </p>
      </aside>
    </div>
  )
}

function ImagePicker({
  label,
  current,
  busy,
  onPick,
  onClear,
}: {
  label: string
  current: string
  busy: boolean
  onPick: (file: File) => void
  onClear: () => void
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="mt-1.5 flex items-center gap-3">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current}
            alt=""
            className="h-14 w-14 rounded-lg border border-sand-200 object-cover"
          />
        ) : (
          <span className="h-14 w-14 rounded-lg border border-dashed border-sand-300" />
        )}

        <div className="space-y-1">
          <label className="btn-secondary cursor-pointer text-xs">
            {busy ? 'Uploading…' : current ? 'Replace' : 'Upload'}
            <input
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onPick(file)
                event.target.value = ''
              }}
            />
          </label>
          {current ? (
            <button
              type="button"
              onClick={onClear}
              className="block text-xs text-ink-muted hover:text-ink"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
