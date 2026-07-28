'use client'

import { useEffect, useState, useTransition } from 'react'

import {
  generateCopy,
  publishListing,
  saveCopy,
  unpublishListing,
} from '@/app/(dashboard)/dashboard/listings/[id]/actions'
import { cn } from '@/lib/utils'

type Props = {
  listingId: string
  slug: string
  status: string
  headline: string | null
  description: string | null
  highlights: string[]
  publicUrl: string
}

export function ListingCopyEditor(props: Props) {
  const [headline, setHeadline] = useState(props.headline ?? '')
  const [description, setDescription] = useState(props.description ?? '')
  const [highlights, setHighlights] = useState<string[]>(props.highlights)

  const [busy, setBusy] = useState<null | 'generate' | 'save' | 'publish'>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [, startTransition] = useTransition()

  const published = props.status === 'published'
  const hasCopy = headline.trim().length > 0 && description.trim().length > 0

  /**
   * The server action revalidates and Next re-renders this component with fresh
   * props. Sync local state to them, otherwise a regenerate leaves the textareas
   * showing the previous copy.
   */
  useEffect(() => {
    setHeadline(props.headline ?? '')
    setDescription(props.description ?? '')
    setHighlights(props.highlights)
  }, [props.headline, props.description, props.highlights])

  // Auto-dismiss the success line so it can't be mistaken for current state
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  function run(
    kind: 'generate' | 'save' | 'publish',
    task: () => Promise<{ ok: boolean; error?: string }>,
  ) {
    setBusy(kind)
    setError(null)
    setNotice(null)

    startTransition(async () => {
      try {
        const result = await task()

        if (!result.ok) {
          setError(result.error ?? 'Something went wrong.')
        } else {
          setNotice(
            kind === 'generate'
              ? 'Copy generated. Edit anything you like, then save.'
              : kind === 'save'
                ? 'Saved.'
                : published
                  ? 'Listing taken offline.'
                  : 'Published. Your link is live.',
          )
        }
      } finally {
        setBusy(null)
      }
    })
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(props.publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy the link. Select and copy it manually.')
    }
  }

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------------- generate */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-medium text-ink">
              {hasCopy ? 'Regenerate from your notes' : 'Write the listing copy'}
            </h3>
            <p className="mt-1 text-sm text-ink-soft">
              {hasCopy
                ? 'Replaces the copy below. Your edits will be lost.'
                : 'Uses the facts and notes above. Takes a second or two.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => run('generate', () => generateCopy(props.listingId))}
            disabled={busy !== null}
            className={hasCopy ? 'btn-secondary' : 'btn-primary'}
          >
            {busy === 'generate' ? 'Writing…' : hasCopy ? 'Regenerate' : 'Generate copy'}
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- edit */}
      {hasCopy ? (
        <div className="card space-y-5">
          <div>
            <label htmlFor="headline" className="label">
              Headline
            </label>
            <input
              id="headline"
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
              className="input font-display text-lg"
            />
            <p className="mt-1 text-xs text-ink-muted">{headline.length} characters</p>
          </div>

          <div>
            <label htmlFor="description" className="label">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={10}
              className="input leading-relaxed"
            />
            <p className="mt-1 text-xs text-ink-muted">
              {description.trim().split(/\s+/).filter(Boolean).length} words
            </p>
          </div>

          <div>
            <span className="label">Highlights</span>
            <ul className="mt-1.5 space-y-2">
              {highlights.map((highlight, index) => (
                <li key={index} className="flex gap-2">
                  <input
                    value={highlight}
                    aria-label={`Highlight ${index + 1}`}
                    onChange={(event) =>
                      setHighlights((current) =>
                        current.map((item, i) => (i === index ? event.target.value : item)),
                      )
                    }
                    className="input mt-0 flex-1"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setHighlights((current) => current.filter((_, i) => i !== index))
                    }
                    aria-label={`Remove highlight ${index + 1}`}
                    className="btn-secondary shrink-0 px-3"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            {highlights.length < 8 ? (
              <button
                type="button"
                onClick={() => setHighlights((current) => [...current, ''])}
                className="mt-2 text-sm text-brand-600 hover:text-brand-700"
              >
                + Add highlight
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-sand-200 pt-4">
            <button
              type="button"
              onClick={() =>
                run('save', () =>
                  saveCopy(props.listingId, {
                    headline,
                    description,
                    highlights: highlights.filter((h) => h.trim().length > 0),
                  }),
                )
              }
              disabled={busy !== null}
              className="btn-secondary"
            >
              {busy === 'save' ? 'Saving…' : 'Save changes'}
            </button>

            <button
              type="button"
              onClick={() =>
                run('publish', () =>
                  published ? unpublishListing(props.listingId) : publishListing(props.listingId),
                )
              }
              disabled={busy !== null}
              className={published ? 'btn-secondary' : 'btn-primary'}
            >
              {busy === 'publish' ? 'Working…' : published ? 'Take offline' : 'Publish listing'}
            </button>

            <p className="text-sm text-ink-muted">
              {published
                ? 'Live — buyers can open your link.'
                : 'Save your edits before publishing.'}
            </p>
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------------ share link */}
      {published ? (
        <div className="card">
          <h3 className="font-medium text-ink">Shareable link</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              readOnly
              value={props.publicUrl}
              onFocus={(event) => event.currentTarget.select()}
              className="input mt-0 flex-1 font-mono text-xs"
            />
            <button type="button" onClick={copyLink} className="btn-secondary shrink-0">
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <a
              href={`/listing/${props.slug}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary shrink-0"
            >
              Open
            </a>
          </div>
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-accent bg-accent-soft/20 px-4 py-3 text-sm text-ink"
        >
          {error}
        </p>
      ) : null}

      {notice ? (
        <p
          className={cn(
            'rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800',
          )}
        >
          {notice}
        </p>
      ) : null}
    </div>
  )
}
