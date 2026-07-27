'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

export type GalleryImage = {
  id: string
  url: string
}

/**
 * Swipeable image carousel.
 *
 * Scrolling is native CSS scroll-snap rather than a JS carousel library: it
 * gives correct touch momentum on phones for free, works before hydration, and
 * costs no bundle weight. JS only drives the arrows, dots and counter.
 */
export function ListingGallery({ images, alt }: { images: GalleryImage[]; alt: string }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  const scrollTo = useCallback((target: number) => {
    const track = trackRef.current
    if (!track) return

    const clamped = Math.max(0, Math.min(images.length - 1, target))
    track.scrollTo({ left: clamped * track.clientWidth, behavior: 'smooth' })
  }, [images.length])

  // Derive the active slide from scroll position so swiping, arrows and dots
  // can never disagree about which image is showing.
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

  if (images.length === 0) {
    // Short and neutral. A full-bleed coloured block here reads as a broken page.
    return (
      <div className="flex h-40 items-center justify-center border-b border-sand-200 bg-sand-200/60">
        <p className="text-sm text-ink-muted">No photos yet</p>
      </div>
    )
  }

  const single = images.length === 1

  return (
    <div className="relative bg-ink">
      <div
        ref={trackRef}
        className={cn(
          'no-scrollbar flex w-full overflow-x-auto',
          !single && 'snap-x snap-mandatory',
        )}
      >
        {images.map((image, position) => (
          <div
            key={image.id}
            /**
             * Fixed heights, not aspect ratios. The gallery is full-bleed, so an
             * aspect ratio makes the image grow with viewport width — 16:9 on a
             * wide monitor is ~620px tall and pushes the entire listing below the
             * fold. A capped height keeps the photo and the price on screen
             * together at any width.
             */
            className="relative h-[260px] w-full shrink-0 snap-center sm:h-[380px] lg:h-[440px]"
          >
            <Image
              src={image.url}
              alt={position === 0 ? alt : `${alt} — photo ${position + 1}`}
              fill
              sizes="100vw"
              className="object-cover"
              // Only the first image is above the fold; the rest can wait
              priority={position === 0}
            />
          </div>
        ))}
      </div>

      {!single ? (
        <>
          <button
            type="button"
            onClick={() => scrollTo(index - 1)}
            disabled={index === 0}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-sand-50/90 p-2 text-ink shadow-sm transition-opacity hover:bg-sand-50 disabled:opacity-0 sm:block"
          >
            <Chevron direction="left" />
          </button>

          <button
            type="button"
            onClick={() => scrollTo(index + 1)}
            disabled={index === images.length - 1}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-sand-50/90 p-2 text-ink shadow-sm transition-opacity hover:bg-sand-50 disabled:opacity-0 sm:block"
          >
            <Chevron direction="right" />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink/60 px-2.5 py-1.5">
            {images.map((image, position) => (
              <button
                key={image.id}
                type="button"
                onClick={() => scrollTo(position)}
                aria-label={`Go to photo ${position + 1}`}
                aria-current={position === index}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  position === index ? 'w-4 bg-sand-50' : 'w-1.5 bg-sand-50/50',
                )}
              />
            ))}
          </div>

          <p className="absolute right-3 top-3 rounded-full bg-ink/60 px-2 py-0.5 text-xs text-sand-50">
            {index + 1} / {images.length}
          </p>
        </>
      ) : null}
    </div>
  )
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
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
  )
}
