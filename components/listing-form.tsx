'use client'

import { upload } from '@vercel/blob/client'
import { useRef, useState, useTransition } from 'react'

import { createListing } from '@/app/(dashboard)/dashboard/listings/new/actions'
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGES_PER_LISTING, MAX_IMAGE_BYTES } from '@/lib/blob'
import { checkPlausibility } from '@/lib/plausibility'
import { PROPERTY_TYPES } from '@/lib/property-types'
import { cn } from '@/lib/utils'

const EMPTY_FACTS = {
  price: '',
  beds: '',
  baths: '',
  sqft: '',
  propertyType: '',
  yearBuilt: '',
  lotSize: '',
  monthlyFee: '',
}

function toNumberOrNull(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

type UploadedImage = {
  localId: string
  name: string
  /** Object URL for instant preview while the real upload is in flight. */
  previewUrl: string
  url: string | null
  status: 'uploading' | 'done' | 'error'
  error?: string
}

export function ListingForm({ uploadsEnabled }: { uploadsEnabled: boolean }) {
  const [images, setImages] = useState<UploadedImage[]>([])
  const [facts, setFacts] = useState(EMPTY_FACTS)
  const [coverId, setCoverId] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploading = images.some((image) => image.status === 'uploading')

  // Live typo check on the numbers. Warnings only — they never block saving.
  const warnings = checkPlausibility({
    price: toNumberOrNull(facts.price),
    beds: toNumberOrNull(facts.beds),
    baths: toNumberOrNull(facts.baths),
    sqft: toNumberOrNull(facts.sqft),
  })

  function setFact(key: keyof typeof EMPTY_FACTS) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFacts((current) => ({ ...current, [key]: event.target.value }))
  }

  async function addFiles(files: File[]) {
    setFormError(null)

    const room = MAX_IMAGES_PER_LISTING - images.length
    const accepted: File[] = []

    for (const file of files.slice(0, Math.max(0, room))) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
        setFormError(`${file.name} isn't a JPEG, PNG, WebP or AVIF image.`)
        continue
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setFormError(`${file.name} is larger than ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB.`)
        continue
      }
      accepted.push(file)
    }

    if (files.length > room) {
      setFormError(`You can attach up to ${MAX_IMAGES_PER_LISTING} images.`)
    }

    if (accepted.length === 0) return

    const queued: UploadedImage[] = accepted.map((file) => ({
      localId: crypto.randomUUID(),
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      url: null,
      status: 'uploading',
    }))

    setImages((current) => [...current, ...queued])
    setCoverId((current) => current ?? queued[0].localId)

    // Uploads go browser → Blob directly, so a dozen large photos never touch
    // our serverless function or its ~4.5 MB body limit.
    await Promise.all(
      queued.map(async (item, index) => {
        try {
          const result = await upload(accepted[index].name, accepted[index], {
            access: 'public',
            handleUploadUrl: '/api/blob/upload',
          })

          setImages((current) =>
            current.map((image) =>
              image.localId === item.localId
                ? { ...image, url: result.url, status: 'done' }
                : image,
            ),
          )
        } catch (error) {
          setImages((current) =>
            current.map((image) =>
              image.localId === item.localId
                ? {
                    ...image,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Upload failed',
                  }
                : image,
            ),
          )
        }
      }),
    )
  }

  function removeImage(localId: string) {
    setImages((current) => {
      const target = current.find((image) => image.localId === localId)
      if (target) URL.revokeObjectURL(target.previewUrl)

      const next = current.filter((image) => image.localId !== localId)
      setCoverId((cover) => (cover === localId ? (next[0]?.localId ?? null) : cover))
      return next
    })
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setFieldErrors({})

    const data = new FormData(event.currentTarget)

    const payload = {
      address: String(data.get('address') ?? ''),
      rawDescription: String(data.get('rawDescription') ?? ''),
      price: String(data.get('price') ?? ''),
      beds: String(data.get('beds') ?? ''),
      baths: String(data.get('baths') ?? ''),
      sqft: String(data.get('sqft') ?? ''),
      propertyType: String(data.get('propertyType') ?? ''),
      yearBuilt: String(data.get('yearBuilt') ?? ''),
      lotSize: String(data.get('lotSize') ?? ''),
      monthlyFee: String(data.get('monthlyFee') ?? ''),
      features: String(data.get('features') ?? ''),
      images: images
        .filter((image) => image.status === 'done' && image.url)
        .map((image) => ({ url: image.url as string, isCover: image.localId === coverId })),
    }

    startTransition(async () => {
      // On success the action redirects, so nothing is returned.
      const result = await createListing(payload)

      if (result && !result.ok) {
        setFormError(result.error)
        setFieldErrors(result.fieldErrors ?? {})
      }
    })
  }

  const disabled = pending || uploading

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* ---------------------------------------------------------------- images */}
      <section>
        <h2 className="font-display text-lg text-brand-900">Photos</h2>

        {uploadsEnabled ? (
          <div
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              void addFiles(Array.from(event.dataTransfer.files))
            }}
            className={cn(
              'mt-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
              dragging ? 'border-brand-400 bg-brand-50' : 'border-sand-300 bg-sand-50',
            )}
          >
            <p className="text-sm text-ink-soft">Drag photos here, or</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary mt-3"
            >
              Choose files
            </button>
            <p className="mt-3 text-xs text-ink-muted">
              JPEG, PNG, WebP or AVIF · up to {Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB each ·
              max {MAX_IMAGES_PER_LISTING} photos
            </p>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              className="hidden"
              onChange={(event) => {
                void addFiles(Array.from(event.target.files ?? []))
                event.target.value = ''
              }}
            />
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-accent-soft bg-accent-soft/20 p-4">
            <p className="text-sm font-medium text-ink">Photo uploads aren&apos;t configured yet</p>
            <p className="mt-1.5 text-sm text-ink-soft">
              Create a Blob store in your Vercel project (Storage → Blob) and put its token in{' '}
              <code className="font-mono text-xs">BLOB_READ_WRITE_TOKEN</code>. You can still create
              listings without photos in the meantime.
            </p>
          </div>
        )}

        {images.length > 0 ? (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((image) => (
              <li
                key={image.localId}
                className="group relative overflow-hidden rounded-lg border border-sand-200 bg-sand-50"
              >
                {/* Local preview: intentionally a plain <img>, since object: and
                    blob: URLs can't go through next/image optimisation. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.previewUrl}
                  alt={image.name}
                  className="aspect-[4/3] w-full object-cover"
                />

                <div className="absolute inset-x-0 top-0 flex items-start justify-between p-1.5">
                  {image.localId === coverId ? (
                    <span className="rounded bg-brand-700 px-1.5 py-0.5 text-[10px] font-medium text-sand-50">
                      Cover
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCoverId(image.localId)}
                      className="rounded bg-ink/70 px-1.5 py-0.5 text-[10px] text-sand-50 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      Make cover
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => removeImage(image.localId)}
                    aria-label={`Remove ${image.name}`}
                    className="rounded bg-ink/70 px-1.5 py-0.5 text-[10px] text-sand-50"
                  >
                    Remove
                  </button>
                </div>

                {image.status !== 'done' ? (
                  <div className="absolute inset-x-0 bottom-0 bg-ink/75 px-2 py-1 text-[11px] text-sand-50">
                    {image.status === 'uploading' ? 'Uploading…' : (image.error ?? 'Failed')}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* ----------------------------------------------------------------- facts */}
      <section>
        <h2 className="font-display text-lg text-brand-900">The facts</h2>

        <div className="mt-3 space-y-4">
          <Field name="address" label="Address" error={fieldErrors.address}>
            <input
              id="address"
              name="address"
              required
              placeholder="Storgatan 14, 114 55 Stockholm"
              className="input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field name="price" label="Price (SEK)" error={fieldErrors.price}>
              <input
                id="price"
                name="price"
                type="number"
                min={0}
                step={1}
                placeholder="7450000"
                value={facts.price}
                onChange={setFact('price')}
                className="input"
              />
            </Field>
            <Field name="beds" label="Bedrooms" error={fieldErrors.beds}>
              <input
                id="beds"
                name="beds"
                type="number"
                min={0}
                step={1}
                value={facts.beds}
                onChange={setFact('beds')}
                className="input"
              />
            </Field>
            <Field name="baths" label="Bathrooms" error={fieldErrors.baths}>
              <input
                id="baths"
                name="baths"
                type="number"
                min={0}
                step={0.5}
                value={facts.baths}
                onChange={setFact('baths')}
                className="input"
              />
            </Field>
            <Field name="sqft" label="Living area (m²)" error={fieldErrors.sqft}>
              <input
                id="sqft"
                name="sqft"
                type="number"
                min={0}
                step={1}
                placeholder="98"
                value={facts.sqft}
                onChange={setFact('sqft')}
                className="input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field name="propertyType" label="Property type" error={fieldErrors.propertyType}>
              <select
                id="propertyType"
                name="propertyType"
                value={facts.propertyType}
                onChange={setFact('propertyType')}
                className="input"
              >
                <option value="">Not specified</option>
                {PROPERTY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field name="yearBuilt" label="Year built" error={fieldErrors.yearBuilt}>
              <input
                id="yearBuilt"
                name="yearBuilt"
                type="number"
                min={1200}
                step={1}
                placeholder="1928"
                value={facts.yearBuilt}
                onChange={setFact('yearBuilt')}
                className="input"
              />
            </Field>
            <Field name="lotSize" label="Plot size (m²)" error={fieldErrors.lotSize}>
              <input
                id="lotSize"
                name="lotSize"
                type="number"
                min={0}
                step={1}
                value={facts.lotSize}
                onChange={setFact('lotSize')}
                className="input"
              />
            </Field>
            <Field name="monthlyFee" label="Monthly fee (SEK)" error={fieldErrors.monthlyFee}>
              <input
                id="monthlyFee"
                name="monthlyFee"
                type="number"
                min={0}
                step={1}
                placeholder="3450"
                value={facts.monthlyFee}
                onChange={setFact('monthlyFee')}
                className="input"
              />
            </Field>
          </div>

          {warnings.length > 0 ? (
            <ul className="mt-3 space-y-1.5 rounded-lg border border-accent bg-accent-soft/20 px-4 py-3">
              {warnings.map((warning) => (
                <li key={`${warning.field}-${warning.message}`} className="text-sm text-ink">
                  <span className="font-medium">Check this:</span> {warning.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {/* ----------------------------------------------------------------- notes */}
      <section>
        <h2 className="font-display text-lg text-brand-900">Features</h2>
        <p className="mt-1 text-sm text-ink-soft">
          One per line. These appear as a checklist on the listing page and are given to the AI.
        </p>
        <Field name="features" label="" error={fieldErrors.features}>
          <textarea
            id="features"
            name="features"
            rows={5}
            placeholder={'Balcony\nDishwasher\nFireplace\nLift in building\nStorage in basement'}
            className="input"
          />
        </Field>
      </section>

      <section>
        <h2 className="font-display text-lg text-brand-900">Your notes</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Rough is fine — bullet points, half sentences, whatever you&apos;d jot down after a
          viewing. Mention anything that makes the place worth seeing.
        </p>

        <Field name="rawDescription" label="" error={fieldErrors.rawDescription}>
          <textarea
            id="rawDescription"
            name="rawDescription"
            required
            rows={7}
            placeholder={
              '3 rooms, top floor, corner apartment. Renovated kitchen 2021. Balcony faces south-west. Building from 1928, lift installed 2019. Close to Karlaplan metro.'
            }
            className="input"
          />
        </Field>
      </section>

      {formError ? (
        <p
          role="alert"
          className="rounded-lg border border-accent bg-accent-soft/20 px-4 py-3 text-sm text-ink"
        >
          {formError}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={disabled} className="btn-primary">
          {pending ? 'Saving…' : 'Save listing'}
        </button>
        {uploading ? (
          <span className="text-sm text-ink-muted">Waiting for photos to finish uploading…</span>
        ) : null}
      </div>
    </form>
  )
}

function Field({
  name,
  label,
  error,
  children,
}: {
  name: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      {label ? (
        <label htmlFor={name} className="label">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1.5 text-sm text-accent" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
