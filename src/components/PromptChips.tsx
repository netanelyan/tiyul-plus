'use client';

import { useEffect, useState } from 'react';
import { pickChips, type PromptChip } from '@/lib/promptChips';

/**
 * צ׳יפים של הצעות פתיחה - נבחרים בצד הלקוח אחרי mount (הבחירה אקראית,
 * ולכן ב-SSR מרונדר שלד יציב באותו גובה כדי למנוע קפיצת פריסה והידרציה
 * שבורה). לחיצה ממלאת את הקלט - לא שולחת: onPick מקבל את הטקסט לעריכה.
 */
export default function PromptChips({ onPick }: { onPick: (text: string) => void }) {
  const [chips, setChips] = useState<PromptChip[] | null>(null);

  useEffect(() => {
    setChips(pickChips());
  }, []);

  return (
    <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {chips === null
        ? Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              aria-hidden
              className="h-[46px] animate-pulse rounded-xl bg-night/[0.04]"
            />
          ))
        : chips.map((chip) => (
            <button
              key={chip.text}
              onClick={() => onPick(chip.text)}
              className="card-pop rise-in rounded-xl bg-shell px-4 py-3 text-start text-sm font-semibold leading-snug text-night/75 ring-1 ring-night/10 transition hover:text-night hover:ring-night/25"
            >
              {chip.text}
            </button>
          ))}
    </div>
  );
}
