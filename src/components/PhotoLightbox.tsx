'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PlaceThumb from '@/components/PlaceThumb';
import type { Place } from '@/lib/types';

/**
 * Tapping a place photo opens it full screen.
 *
 * ## Why it is portalled to <body>
 *
 * Every surface that uses this - the shared trip, the story, the group trip -
 * wraps its content in `.rise-in`, and that animation keeps its final transform
 * forever. A transform creates a containing block, so a `position: fixed`
 * overlay rendered inside it is measured against that element instead of the
 * screen: the same trap this repo already documents for the header's
 * backdrop-blur (`AccountButton`, `SiteSearch`) and for the mobile chat bar.
 * `createPortal` to body is the fix, and it is not optional here.
 *
 * ## The image is shown at its existing width, deliberately
 *
 * The catalog stores Wikimedia thumbnails, usually 500px. It is tempting to swap
 * the width up to 960 for a zoom - and that is exactly the bug that killed 170
 * photo URLs (entries (k) and (q)): Wikimedia only serves a thumbnail NARROWER
 * than the source, so widening 404s wherever the original is smaller. So the
 * lightbox shows the URL we already verified, laid out large. On a phone that is
 * a real zoom from a 64px thumbnail; on a wide desktop it is capped rather than
 * upscaled into mush.
 */

function Overlay({
  src,
  alt,
  title,
  caption,
  onClose,
}: {
  src: string;
  alt: string;
  title?: string;
  caption?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // Stop the page behind from scrolling under the overlay
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title ?? alt}
      onClick={onClose}
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-night/85 p-4 backdrop-blur-sm"
    >
      <button
        onClick={onClose}
        aria-label="סגירה"
        className="absolute end-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-cream/15 text-2xl leading-none text-cream transition hover:bg-cream/25"
      >
        ×
      </button>
      {/* Stops a click on the picture itself from closing it */}
      <figure onClick={(e) => e.stopPropagation()} className="max-h-full w-full max-w-3xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="mx-auto max-h-[75vh] w-auto max-w-full rounded-2xl object-contain shadow-pop"
        />
        {(title || caption) && (
          <figcaption className="mx-auto mt-3 max-w-xl text-center">
            {title && <p className="font-bold text-cream">{title}</p>}
            {caption && <p className="mt-1 text-sm leading-relaxed text-cream/75">{caption}</p>}
          </figcaption>
        )}
      </figure>
    </div>,
    document.body,
  );
}

/**
 * A place thumbnail that opens full screen when tapped. Falls back to a plain
 * (non-interactive) thumbnail when the place has no photo, so the category tile
 * never pretends to be something you can enlarge.
 */
export function ZoomablePhoto({
  place,
  className = '',
}: {
  place: Place;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  if (!place.photo) return <PlaceThumb place={place} className={className} />;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`הגדלת התמונה של ${place.name}`}
        className={`${className} group relative shrink-0 cursor-zoom-in overflow-hidden rounded-xl`}
      >
        <PlaceThumb place={place} className="h-full w-full" />
        <span
          aria-hidden
          className="absolute inset-0 flex items-end justify-end bg-night/0 p-1 text-cream opacity-0 transition group-hover:bg-night/25 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <span className="rounded-md bg-night/60 px-1.5 py-0.5 text-[10px] font-bold">🔍</span>
        </span>
      </button>
      {open && (
        <Overlay
          src={place.photo}
          alt={place.name}
          title={place.name}
          caption={place.description || undefined}
          onClose={close}
        />
      )}
    </>
  );
}

/** The same overlay for a plain image - the travellers' own uploaded story photos. */
export function ZoomableImage({
  src,
  alt,
  caption,
  className = '',
}: {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={caption ? `הגדלה: ${caption}` : 'הגדלת התמונה'}
        className={`${className} block w-full cursor-zoom-in`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
      </button>
      {open && <Overlay src={src} alt={alt} caption={caption} onClose={close} />}
    </>
  );
}
