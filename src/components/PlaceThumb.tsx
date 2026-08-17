'use client';

import { useState } from 'react';
import { categoryMeta } from '@/lib/categories';
import type { Place } from '@/lib/types';

/**
 * A place's small photo - with an orderly fallback when there is no photo.
 *
 * Some places in the catalog simply have no freely licensed photo: kosher restaurants, Chabad
 * houses, markets and small synagogues are almost never photographed on Wikimedia Commons under
 * an open licence. Until now we simply showed nothing, which made the list look broken - some
 * cards with a square and some without.
 *
 * Instead, a square in the category's colour with its emoji is shown here. It looks deliberate,
 * keeps the same aspect ratio across all the cards, and does not pretend to be a photograph of
 * the place.
 *
 * The same fallback also catches the case where a photo URL exists but fails to load (onError),
 * so a broken link does not leave an empty square.
 */
export default function PlaceThumb({
  place,
  className = '',
  rounded = 'rounded-xl',
}: {
  place: Place;
  /** Dimensions - set at the call site, for example "h-20 w-20 shrink-0" */
  className?: string;
  rounded?: string;
}) {
  const [failed, setFailed] = useState(false);
  const meta = categoryMeta[place.category];
  const show = place.photo && !failed;

  if (show) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={place.photo}
        alt={place.name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${className} ${rounded} object-cover ring-1 ring-night/10`}
      />
    );
  }

  return (
    <div
      className={`${className} ${rounded} flex items-center justify-center ring-1 ring-night/10`}
      style={{ backgroundColor: `${meta.color}1a` }}
      role="img"
      aria-label={meta.label}
      title={meta.label}
    >
      <span aria-hidden className="text-2xl opacity-80">
        {meta.emoji}
      </span>
    </div>
  );
}
