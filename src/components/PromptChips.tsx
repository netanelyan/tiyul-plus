'use client';

import { useEffect, useState } from 'react';
import { pickChips, type PromptChip } from '@/lib/promptChips';

/**
 * צ׳יפים של הצעות פתיחה - גלולות בשורה אחת, "רעיונות לגנוב" ולא כפתורי
 * טופס: אימוג׳י חם אחד מוביל כל גלולה, hover בקורל. נבחרים בצד הלקוח
 * אחרי mount (הבחירה אקראית - ב-SSR שלד יציב באותו גובה). לחיצה ממלאת
 * את הקלט לעריכה (chip.fill כשהטקסט המוצג קצר מטקסט המילוי), לא שולחת.
 */

const SKELETON_WIDTHS = [150, 190, 130, 170];

export default function PromptChips({ onPick }: { onPick: (text: string) => void }) {
  const [chips, setChips] = useState<PromptChip[] | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setChips(pickChips());
  }, []);

  const visible = chips === null ? null : expanded ? chips : chips.slice(0, 4);

  return (
    <div className="mt-6 flex w-full max-w-2xl flex-wrap justify-center gap-2">
      {visible === null ? (
        SKELETON_WIDTHS.map((w, i) => (
          <div
            key={i}
            aria-hidden
            className="h-[38px] animate-pulse rounded-full bg-night/[0.04]"
            style={{ width: w }}
          />
        ))
      ) : (
        <>
          {visible.map((chip) => (
            <button
              key={chip.text}
              onClick={() => onPick(chip.fill ?? chip.text)}
              className="group badge rise-in max-w-full whitespace-nowrap rounded-full bg-shell px-4 py-2 text-sm font-semibold text-night/70 ring-1 ring-night/10 transition hover:bg-sunset/5 hover:text-night hover:ring-sunset/30"
            >
              <span className="shrink-0 text-base leading-none" aria-hidden>
                {chip.emoji}
              </span>
              <span className="truncate">{chip.text}</span>
            </button>
          ))}
          {chips !== null && chips.length > 4 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="rise-in whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold text-night/45 transition hover:text-sunset-deep"
            >
              {expanded ? 'פחות רעיונות' : 'עוד רעיונות +'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
