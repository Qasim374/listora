'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

export type GalleryImage = {
  id: string
  url: string
}

/**
 * Swipeable carousel with a thumbnail strip and a full-screen lightbox.
 *
 * Scrolling is native CSS scroll-snap rather than a JS carousel library: correct
 * touch momentum on phones for free, works before hydration, no bundle weight.
 * JS only drives the arrows, thumbnails, counter and lightbox.
 */
export function ListingGallery({ images, alt }: { images: GalleryImage[]; alt: string }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [lightbox, setLightbox] = useState(false)

  const scrollTo = useCallback(
    (target: number) => {
      const track = trackRef.current
      if (!track) return

      const clamped = Math.max(0, Math.min(images.length - 1, target))
      track.scrollTo({ left: clamped * track.clientWidth, behavior: 'smooth' })
    },
    [images.length],
  )

  // Derive the active slide from scroll position so swiping, arrows and
  // thumbnails can never disagree about which image is showing.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    let frame = 0

    function onScroll() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!track || track.clientWidth === 0) return
        setIndex(Math.round(track.scrollLeft / track.clientWidth))
      })
    }

    track.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      track.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  // Arrow keys move through photos; Escape leaves the lightbox.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && lightbox) setLightbox(false)
      if (event.key === 'ArrowLeft') scrollTo(index - 1)
      if (event.key === 'ArrowRight') scrollTo(index + 1)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, lightbox, scrollTo])

  // Freeze background scrolling while the lightbox is open
  useEffect(() => {
    if (!lightbox) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [lightbox])

  if (images.length === 0) {
    // Short and neutral. A full-bleed coloured block reads as a broken page.
    return (
      <div className="flex h-40 items-center justify-center border-b border-sand-200 bg-sand-200/60">
        <p className="text-sm text-ink-muted">No photos yet</p>
      </div>
    )
  }

  const single = images.length === 1

  return (
    <>
      <div className="relative bg-ink">
        <div
          ref={trackRef}
          className={cn(
            'no-scrollbar flex w-full overflow-x-auto',
            !single && 'snap-x snap-mandatory',
          )}
        >
          {images.map((image, position) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setLightbox(true)}
              aria-label={`Open photo ${position + 1} full screen`}
              /**
               * Fixed heights, not aspect ratios. The gallery is full-bleed, so
               * an aspect ratio grows with viewport width — 16:9 on a wide
               * monitor is ~620px tall and pushes the price below the fold.
               */
              className="relative h-[260px] w-full shrink-0 cursor-zoom-in snap-center sm:h-[380px] lg:h-[440px]"
            >
              <Image
                src={image.url}
                alt={position === 0 ? alt : `${alt} — photo ${position + 1}`}
                fill
                sizes="100vw"
                className="object-cover"
                priority={position === 0}
              />
            </button>
          ))}
        </div>

        {!single ? (
          <>
            <GalleryArrow
              direction="left"
              onClick={() => scrollTo(index - 1)}
              disabled={index === 0}
            />
            <GalleryArrow
              direction="right"
              onClick={() => scrollTo(index + 1)}
              disabled={index === images.length - 1}
            />

            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink/60 px-2.5 py-1.5 sm:hidden">
              {images.map((image, position) => (
                <span
                  key={image.id}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    position === index ? 'w-4 bg-sand-50' : 'w-1.5 bg-sand-50/50',
                  )}
                />
              ))}
            </div>
          </>
        ) : null}

        <p className="absolute right-3 top-3 rounded-full bg-ink/60 px-2.5 py-1 text-xs text-sand-50">
          {index + 1} / {images.length}
        </p>

        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="absolute bottom-3 right-3 rounded-lg bg-sand-50/90 px-3 py-1.5 text-xs font-medium text-ink shadow-sm hover:bg-sand-50"
        >
          View all photos
        </button>
      </div>

      {/* Thumbnail strip — desktop only; phones have swipe and dots */}
      {!single ? (
        <div className="hidden border-b border-sand-200 bg-sand-50 sm:block">
          <div className="no-scrollbar mx-auto flex max-w-content gap-2 overflow-x-auto px-6 py-3">
            {images.map((image, position) => (
              <button
                key={image.id}
                type="button"
                onClick={() => scrollTo(position)}
                aria-label={`Show photo ${position + 1}`}
                aria-current={position === index}
                className={cn(
                  'relative h-14 w-20 shrink-0 overflow-hidden rounded transition-all',
                  position === index
                    ? 'ring-2 ring-brand-500 ring-offset-1 ring-offset-sand-50'
                    : 'opacity-60 hover:opacity-100',
                )}
              >
                <Image src={image.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {lightbox ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo gallery"
          className="fixed inset-0 z-50 flex flex-col bg-ink/95"
          onClick={() => setLightbox(false)}
        >
          <div className="flex items-center justify-between px-4 py-3 text-sand-50">
            <span className="text-sm">
              {index + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={() => setLightbox(false)}
              className="rounded px-3 py-1 text-sm hover:bg-sand-50/10"
            >
              Close ✕
            </button>
          </div>

          {/* Stop propagation so tapping a photo doesn't close the lightbox */}
          <div
            className="no-scrollbar flex flex-1 snap-x snap-mandatory overflow-x-auto"
            onClick={(event) => event.stopPropagation()}
          >
            {images.map((image, position) => (
              <div key={image.id} className="relative w-full shrink-0 snap-center">
                <Image
                  src={image.url}
                  alt={`${alt} — photo ${position + 1}`}
                  fill
                  sizes="100vw"
                  className="object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  )
}

function GalleryArrow({
  direction,
  onClick,
  disabled,
}: {
  direction: 'left' | 'right'
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'left' ? 'Previous photo' : 'Next photo'}
      className={cn(
        'absolute top-1/2 hidden -translate-y-1/2 rounded-full bg-sand-50/90 p-2 text-ink shadow-sm transition-opacity hover:bg-sand-50 disabled:opacity-0 sm:block',
        direction === 'left' ? 'left-2' : 'right-2',
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden
      >
        <path d={direction === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
      </svg>
    </button>
  )
}
