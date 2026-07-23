'use client';

import { useEffect, useState } from 'react';
import { pickChips, type PromptChip } from '@/lib/promptChips';

/**
 * צ׳יפים של הצעות פתיחה - גלולות בשורה אחת, "רעיונות לגנוב" ולא כפתורי
 * טופס: אייקון SVG עדין לפי קטגוריה (שקופה למשתמש), hover חמים בקורל.
 * נבחרים בצד הלקוח אחרי mount (הבחירה אקראית - ב-SSR שלד יציב באותו
 * גובה). לחיצה ממלאת את הקלט לעריכה, לא שולחת.
 */

const ICON_PROPS = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const CATEGORY_ICONS: Record<PromptChip['category'], React.ReactNode> = {
  // מצב חיים - לב
  situation: (
    <svg {...ICON_PROPS} aria-hidden>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
    </svg>
  ),
  // הדגמת יכולת - מחוונים
  capability: (
    <svg {...ICON_PROPS} aria-hidden>
      <line x1="21" y1="4" x2="14" y2="4" />
      <line x1="10" y1="4" x2="3" y2="4" />
      <line x1="21" y1="12" x2="12" y2="12" />
      <line x1="8" y1="12" x2="3" y2="12" />
      <line x1="21" y1="20" x2="16" y2="20" />
      <line x1="12" y1="20" x2="3" y2="20" />
      <line x1="14" y1="2" x2="14" y2="6" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <line x1="16" y1="18" x2="16" y2="22" />
    </svg>
  ),
  // שאלה - סימן שאלה
  question: (
    <svg {...ICON_PROPS} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  ),
};

const SKELETON_WIDTHS = [150, 190, 130, 170, 145, 185];

export default function PromptChips({ onPick }: { onPick: (text: string) => void }) {
  const [chips, setChips] = useState<PromptChip[] | null>(null);

  useEffect(() => {
    setChips(pickChips());
  }, []);

  return (
    <div className="mt-6 flex w-full max-w-2xl flex-wrap justify-center gap-2">
      {chips === null
        ? SKELETON_WIDTHS.map((w, i) => (
            <div
              key={i}
              aria-hidden
              className="h-[38px] animate-pulse rounded-full bg-night/[0.04]"
              style={{ width: w }}
            />
          ))
        : chips.map((chip) => (
            <button
              key={chip.text}
              onClick={() => onPick(chip.text)}
              className="group badge rise-in max-w-full whitespace-nowrap rounded-full bg-shell px-4 py-2 text-sm font-semibold text-night/70 ring-1 ring-night/10 transition hover:bg-sunset/5 hover:text-night hover:ring-sunset/30"
            >
              <span className="shrink-0 text-night/35 transition group-hover:text-sunset-deep">
                {CATEGORY_ICONS[chip.category]}
              </span>
              <span className="truncate">{chip.text}</span>
            </button>
          ))}
    </div>
  );
}
