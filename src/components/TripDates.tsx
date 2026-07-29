'use client';

import { useEffect, useRef, useState } from 'react';
import type { Trip } from '@/lib/trip/types';
import { completeRange, countdown, formatHebrewRange, rangeDays, todayISO } from '@/lib/trip/dates';

/**
 * תאריכי הטיול: מתי יוצאים ומתי חוזרים.
 *
 * ## שתי החלטות שמסבירות את כל הרכיב
 *
 * **1. התאריך לא משנה את התוכנית.** נתנאל בחר טווח (התחלה וסיום) ולא
 * תאריך יציאה בודד, ולטווח יש מספר ימים משלו - שיכול לא להסכים עם
 * מספר הימים שכבר בנויים. הפיתוי הוא לגזור את הימים מהטווח, וזו בדיוק
 * הדרך שבה בחירת תאריך מוחקת יום עם עצירות. לכן: הפער **מוצג** ומוצע
 * לו כפתור מפורש, והוספת ימים (פעולה מוסיפה, לא הרסנית) היא היחידה
 * שהרכיב הזה עושה בעצמו. קיצור נשאר בידיים של המשתמש, במחיקת יום.
 *
 * **2. קצה אחד מספיק.** מי שממלא רק "יוצאים" מקבל "חוזרים" מחושב לפי
 * אורך הטיול הקיים, ולהיפך - כך שהמצב הרגיל תמיד עקבי ואי-ההתאמה היא
 * מצב חריג שהמשתמש יצר במכוון.
 *
 * הספירה לאחור מחושבת **אחרי ה-mount** בלבד: השרת והדפדפן יכולים להיות
 * בימים שונים, וטקסט שתלוי בשעון בזמן hydration הוא אי-התאמה מובטחת
 * (אותה מלכודת שכבר תועדה כאן ב-PromptChips וב-TripWorkspace).
 */
export default function TripDates({
  trip,
  onSet,
  onAddDays,
}: {
  trip: Trip;
  onSet: (dates: { startDate?: string; endDate?: string }) => void;
  onAddDays: (n: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => setToday(todayISO()), []);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const dayCount = trip.days.length;
  const span = rangeDays(trip.startDate, trip.endDate);
  const mismatch = span !== null && dayCount > 0 && span !== dayCount ? span - dayCount : 0;
  const label = formatHebrewRange(trip.startDate, trip.endDate);
  const cd = today ? countdown(today, trip.startDate, trip.endDate) : null;

  const set = (field: 'startDate' | 'endDate', value: string) => {
    const next = { startDate: trip.startDate, endDate: trip.endDate, [field]: value || undefined };
    // קצה שנמחק לגמרי מנקה את שניהם - "טיול בלי תאריכים" הוא מצב תקין
    if (!next.startDate && !next.endDate) return onSet({});
    onSet(completeRange(dayCount, next.startDate, next.endDate));
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 transition ${
          label
            ? 'bg-sunset/10 text-night ring-sunset/25 hover:bg-sunset/15'
            : 'bg-shell text-night/60 ring-night/15 hover:text-night'
        }`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        {label || 'הוספת תאריכים'}
        {cd && cd.kind !== 'past' && (
          <span className="rounded-full bg-sunset px-2 py-0.5 text-xs font-bold text-cream">
            {cd.label}
          </span>
        )}
        <span aria-hidden className="text-[10px] text-night/40">▾</span>
      </button>

      {open && (
        <div className="absolute end-0 top-full z-40 mt-2 w-72 rounded-2xl bg-shell p-4 shadow-[var(--shadow-pop)] ring-1 ring-night/10">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-night/50">יוצאים</span>
              <input
                type="date"
                value={trip.startDate ?? ''}
                onChange={(e) => set('startDate', e.target.value)}
                aria-label="תאריך יציאה"
                className="w-full rounded-xl border border-night/15 bg-cream px-2.5 py-2 text-base text-night outline-none transition focus:border-sunset/40 focus:ring-4 focus:ring-sunset/15 sm:text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-night/50">חוזרים</span>
              <input
                type="date"
                value={trip.endDate ?? ''}
                min={trip.startDate}
                onChange={(e) => set('endDate', e.target.value)}
                aria-label="תאריך חזרה"
                className="w-full rounded-xl border border-night/15 bg-cream px-2.5 py-2 text-base text-night outline-none transition focus:border-sunset/40 focus:ring-4 focus:ring-sunset/15 sm:text-sm"
              />
            </label>
          </div>

          {span !== null && (
            <p className="mt-2.5 text-xs font-medium text-night/50">
              {span} {span === 1 ? 'יום' : 'ימים'} · בתוכנית {dayCount} {dayCount === 1 ? 'יום' : 'ימים'}
            </p>
          )}

          {/* אי-התאמה: אומרים אותה, ולא מתקנים אותה מאחורי הגב */}
          {mismatch > 0 && (
            <div className="mt-2 rounded-xl bg-sunset/10 p-2.5 ring-1 ring-sunset/25">
              <p className="text-xs font-semibold leading-relaxed text-night">
                התאריכים מכסים {mismatch} {mismatch === 1 ? 'יום' : 'ימים'} יותר מהתוכנית.
              </p>
              <button
                onClick={() => onAddDays(mismatch)}
                className="mt-1.5 rounded-lg bg-sunset px-3 py-1.5 text-xs font-bold text-cream transition hover:bg-sunset-deep"
              >
                להוסיף {mismatch} {mismatch === 1 ? 'יום' : 'ימים'} לתוכנית
              </button>
            </div>
          )}
          {mismatch < 0 && (
            <p className="mt-2 rounded-xl bg-night/5 p-2.5 text-xs font-semibold leading-relaxed text-night/70">
              בתוכנית {-mismatch} {-mismatch === 1 ? 'יום' : 'ימים'} יותר ממה שהתאריכים מכסים. אפשר
              להאריך את תאריך החזרה, או למחוק ימים מהתוכנית - לא נמחק לכם ימים לבד.
            </p>
          )}

          {(trip.startDate || trip.endDate) && (
            <button
              onClick={() => {
                onSet({});
                setOpen(false);
              }}
              className="mt-2.5 text-xs font-semibold text-night/45 transition hover:text-night"
            >
              ניקוי התאריכים
            </button>
          )}
        </div>
      )}
    </div>
  );
}
