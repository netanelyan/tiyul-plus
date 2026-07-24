'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  type A11ySettings,
  applyA11y,
  defaultA11y,
  FONT_MAX,
  FONT_MIN,
  loadA11y,
  saveA11y,
} from '@/lib/a11y';

/**
 * ווידג'ט הנגישות: כפתור צף (fixed, פינה תחתונה, RTL-aware) שפותח פאנל
 * עם בקרות - גודל טקסט, ניגודיות, גווני אפור, קו תחתון/הדגשת קישורים,
 * ריווח, סמן מוגדל, עצירת אנימציות, ואיפוס. המצב נשמר ב-localStorage
 * ומוחל על <html>. בשפת העיצוב של האתר (night/sunset/zest/cream).
 */
export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<A11ySettings>(defaultA11y);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // טעינה ראשונית (הסקריפט ב-layout כבר החיל; כאן מסנכרנים את ה-state)
  useEffect(() => {
    setS(loadA11y());
  }, []);

  // סגירה בלחיצה מחוץ לפאנל / Escape
  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (
        !panelRef.current?.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const update = (patch: Partial<A11ySettings>) => {
    setS((prev) => {
      const next = { ...prev, ...patch };
      applyA11y(next);
      saveA11y(next);
      return next;
    });
  };

  const reset = () => {
    applyA11y(defaultA11y);
    saveA11y(defaultA11y);
    setS(defaultA11y);
  };

  const toggles: { key: keyof A11ySettings; label: string }[] = [
    { key: 'contrast', label: 'ניגודיות גבוהה' },
    { key: 'grayscale', label: 'גווני אפור' },
    { key: 'underlineLinks', label: 'קו תחתון לקישורים' },
    { key: 'highlightLinks', label: 'הדגשת קישורים' },
    { key: 'spacing', label: 'ריווח שורות ואותיות' },
    { key: 'bigCursor', label: 'סמן עכבר מוגדל' },
    { key: 'noMotion', label: 'עצירת אנימציות' },
  ];

  return (
    <div className="print:hidden">
      {/* הכפתור הצף */}
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="הגדרות נגישות"
        className="fixed bottom-4 start-4 z-[60] flex h-11 w-11 items-center justify-center rounded-full bg-night text-cream shadow-[0_6px_20px_-6px_rgba(36,27,77,0.5)] ring-2 ring-cream transition hover:bg-night-soft focus:outline-none focus-visible:ring-4 focus-visible:ring-sunset sm:h-12 sm:w-12"
      >
        {/* אייקון נגישות אוניברסלי (person-in-circle) */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="sm:h-[26px] sm:w-[26px]">
          <circle cx="12" cy="4" r="2" />
          <path d="M12 7c-2.5 0-6 .8-6 2.2 0 .9 3 1.3 4.5 1.5l-1.2 6.6a1 1 0 0 0 1.97.36L12 14.5l.75 3.66a1 1 0 0 0 1.97-.36L13.5 10.7c1.5-.2 4.5-.6 4.5-1.5C18 7.8 14.5 7 12 7z" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="הגדרות נגישות"
          className="fixed bottom-20 start-4 z-[60] max-h-[80vh] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl bg-shell p-4 shadow-[var(--shadow-pop)] ring-1 ring-night/15"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-night">הגדרות נגישות</h2>
            <button
              onClick={() => setOpen(false)}
              aria-label="סגירה"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-night/60 transition hover:bg-night/5"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          </div>

          {/* גודל טקסט */}
          <div className="rounded-xl bg-cream p-3 ring-1 ring-night/10">
            <div className="mb-2 text-sm font-bold text-night">גודל טקסט</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => update({ fontLevel: Math.max(FONT_MIN, s.fontLevel - 1) })}
                disabled={s.fontLevel <= FONT_MIN}
                aria-label="הקטנת טקסט"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-shell text-lg font-bold text-night ring-1 ring-night/15 transition hover:ring-sunset/40 disabled:opacity-40"
              >
                −
              </button>
              <button
                onClick={() => update({ fontLevel: 0 })}
                className="flex-1 rounded-lg bg-shell px-3 py-2 text-sm font-semibold text-night/70 ring-1 ring-night/15 transition hover:ring-sunset/40"
              >
                רגיל
              </button>
              <button
                onClick={() => update({ fontLevel: Math.min(FONT_MAX, s.fontLevel + 1) })}
                disabled={s.fontLevel >= FONT_MAX}
                aria-label="הגדלת טקסט"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-shell text-lg font-bold text-night ring-1 ring-night/15 transition hover:ring-sunset/40 disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          {/* טוגלים */}
          <div className="mt-3 space-y-1.5">
            {toggles.map((t) => {
              const on = s[t.key] as boolean;
              return (
                <button
                  key={t.key}
                  onClick={() => update({ [t.key]: !on } as Partial<A11ySettings>)}
                  aria-pressed={on}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold ring-1 transition ${
                    on
                      ? 'bg-sunset text-cream ring-sunset'
                      : 'bg-cream text-night/75 ring-night/10 hover:ring-sunset/30'
                  }`}
                >
                  <span>{t.label}</span>
                  <span
                    aria-hidden
                    className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${
                      on ? 'justify-start bg-cream/40' : 'justify-end bg-night/15'
                    }`}
                  >
                    <span className={`h-4 w-4 rounded-full ${on ? 'bg-cream' : 'bg-shell'}`} />
                  </span>
                </button>
              );
            })}
          </div>

          {/* איפוס + קישור להצהרה */}
          <button
            onClick={reset}
            className="mt-3 w-full rounded-xl bg-night px-3.5 py-2.5 text-sm font-bold text-cream transition hover:bg-night-soft"
          >
            איפוס כל ההגדרות
          </button>
          <Link
            href="/accessibility"
            onClick={() => setOpen(false)}
            className="mt-2 block text-center text-xs font-semibold text-sunset-deep hover:underline"
          >
            הצהרת הנגישות של האתר ←
          </Link>
        </div>
      )}
    </div>
  );
}
