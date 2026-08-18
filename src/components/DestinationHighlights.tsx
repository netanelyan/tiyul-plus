'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CardPhoto from '@/components/CardPhoto';
import { Skeleton } from '@/components/Skeleton';

export interface HighlightCard {
  slug: string;
  heroName: string;
  heroPhoto?: string;
  name: string;
  country: string;
  days: number;
}

const GRID_SIZE = 8;

// Fisher-Yates - an equal chance for every destination to appear, not just those near the start of the array.
function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * The random selection happens only after mount (useEffect) - the page itself stays static
 * (prerendered at build), and on the first render (both on the server and on the client before
 * the effect) a stable skeleton identical on both sides is shown to avoid a hydration mismatch.
 * Exactly the same pattern as pickChips() in PromptChips.
 */
export default function DestinationHighlights({ cards }: { cards: HighlightCard[] }) {
  const [picked, setPicked] = useState<HighlightCard[] | null>(null);

  useEffect(() => {
    setPicked(shuffle(cards).slice(0, GRID_SIZE));
  }, [cards]);

  if (!picked) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="טוענים יעדים"
        className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      >
        {Array.from({ length: Math.min(GRID_SIZE, cards.length) }).map((_, i) => (
          /* The shared skeleton rather than a hand-rolled pulse: this sits on
             the night band, so it is the inverted (cream) variant. */
          <Skeleton key={i} invert className="h-44 rounded-2xl ring-1 ring-cream/10 sm:h-56" />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {picked.map((d) => (
        <Link
          key={d.slug}
          href={`/destinations/${d.slug}`}
          className="card-pop group relative block h-44 overflow-hidden rounded-2xl ring-1 ring-cream/10 sm:h-56"
        >
          {d.heroPhoto ? (
            <CardPhoto
              photo={d.heroPhoto}
              overlay={null}
              className="photo-bg absolute inset-0 transition-transform duration-500 group-hover:scale-105"
              sizes="(min-width: 640px) 46vw, 94vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-night/60 to-night" />
          )}
          {/* A night gradient at the bottom for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="display text-lg leading-tight text-cream drop-shadow sm:text-xl">
              {d.heroName}
            </div>
            <div className="mt-1 truncate text-xs font-medium text-cream/80">
              {d.name} · {d.country} · {d.days} ימים
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
