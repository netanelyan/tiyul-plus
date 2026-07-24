'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export interface HighlightCard {
  slug: string;
  heroName: string;
  heroPhoto?: string;
  name: string;
  country: string;
  days: number;
}

const GRID_SIZE = 8;

// Fisher-Yates - סיכוי שווה לכל יעד להופיע, לא רק למי שקרוב לתחילת המערך.
function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * הבחירה האקראית קורית רק אחרי mount (useEffect) - הדף עצמו נשאר סטטי
 * (prerendered ב-build), ובזמן ה-render הראשון (גם בשרת וגם בלקוח לפני
 * ה-effect) מוצג שלד יציב וזהה משני הצדדים כדי למנוע hydration mismatch.
 * אותו דפוס בדיוק כמו pickChips() ב-PromptChips.
 */
export default function DestinationHighlights({ cards }: { cards: HighlightCard[] }) {
  const [picked, setPicked] = useState<HighlightCard[] | null>(null);

  useEffect(() => {
    setPicked(shuffle(cards).slice(0, GRID_SIZE));
  }, [cards]);

  if (!picked) {
    return (
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: Math.min(GRID_SIZE, cards.length) }).map((_, i) => (
          <div
            key={i}
            className="h-44 animate-pulse rounded-2xl bg-cream/10 ring-1 ring-cream/10 sm:h-56"
          />
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
            <div
              className="photo-bg absolute inset-0 transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url(${d.heroPhoto})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-night/60 to-night" />
          )}
          {/* גרדיאנט night תחתון ללגיביליות הטקסט */}
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
