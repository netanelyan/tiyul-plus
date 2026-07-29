'use client';

import { useEffect, useRef, useState } from 'react';
import type { Trip } from '@/lib/trip/types';
import { completeRange, countdown, formatHebrewRange, rangeDays, todayISO } from '@/lib/trip/dates';

/**
 * תאריכי הטיול: מתי יוצאים ומתי חוזרים.
 *
 * ## שלוש החלטות שמסבירות את הרכיב
 *
 * **1. אין פקד חדש במסך.** הגרסה הראשונה הוסיפה גלולה משלה ("הוספת
 * תאריכים") ובכך שורה שלמה מעל המפה - במסך שכבר סבל מ-29 פקדים מעל
 * הקיפול ו-48% מהגובה לפני שרואים משהו מהטיול. נתנאל צילם את זה ואמר
 * "מכוער, לא פשוט". עכשיו התאריכים יושבים **בתוך צ׳יפ הסיכום שכבר
 * קיים** ("8 ימים · 22 עצירות"), שממילא היה חסר-פעולה - אותו מקום,
 * אפס אובייקטים חדשים.
 *
 * **2. התאריך לא משנה את התוכנית.** נתנאל בחר טווח ולא תאריך יציאה
 * בודד, ולטווח יש מספר ימים משלו שיכול לא להסכים עם מה שכבר בנוי.
 * הפיתוי הוא לגזור את הימים מהטווח - וזו בדיוק הדרך שבה בחירת תאריך
 * מוחקת יום עם עצירות. הפער מוצג, ההוספה היא כפתור מפורש, ומחיקה
 * לעולם לא קורית מכאן.
 *
 * **3. קצה אחד מספיק.** מי שממלא רק "יוצאים" מקבל "חוזרים" לפי אורך
 * הטיול, ולהיפך - כך שהמצב הרגיל תמיד עקבי.
 *
 * הספירה לאחור מחושבת **אחרי ה-mount** בלבד: השרת והדפדפן יכולים להיות
 * בימים שונים, וטקסט שתלוי בשעון בזמן hydration הוא אי-התאמה מובטחת
 * (אותה מלכודת שכבר תועדה כאן ב-PromptChips וב-TripWorkspace).
 */
export default function TripDates({
  trip,
  summary,
  onSet,
  onAddDays,
}: {
  trip: Trip;
  /** הטקסט שהיה בצ׳יפ הסיכום ממילא - "22 עצירות · 8 ימים" */
  summary: string;
  onSet: (dates: { startDate?: string; endDate?: string }) => void;
  onAddDays: (n: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /**
   * הזזה אופקית שמחזירה את הפאנל לתוך המסך.
   *
   * **למה במדידה ולא ב-CSS.** הכפתור יושב באמצע שורת הכותרת, ולכן שום
   * עיגון קבוע לא עובד: `end-0` הגליש 114px ימינה (זה הצילום השני של
   * נתנאל - שדה "יוצאים" מחוץ למסך), ו-`start-0` הגליש 64px שמאלה.
   * `position: fixed` לא בא בחשבון כאן כי לשורש המסך יש `.rise-in`,
   * שמשאיר transform ולכן הופך ל-containing block - המלכודת שכבר
   * מתועדת בקובץ הזה ובגוטצ׳ות. מדידה אחרי הפתיחה עובדת בכל רוחב,
   * בשני כיווני הכתיבה, ובכל מקום שבו הכפתור יימצא בעתיד.
   */
  const [shift, setShift] = useState(0);

  useEffect(() => setToday(todayISO()), []);

  useEffect(() => {
    if (!open) {
      setShift(0);
      return;
    }
    const el = panelRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const M = 8;
    let dx = 0;
    if (r.left < M) dx = M - r.left;
    else if (r.right > window.innerWidth - M) dx = window.innerWidth - M - r.right;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (dx) setShift(dx);
  }, [open]);

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
    <div ref={rootRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={label ? `תאריכי הטיול: ${label}` : 'הוספת תאריכים לטיול'}
        className="badge flex items-center gap-1.5 rounded-full bg-night/5 px-3 py-1 text-xs font-semibold text-night/60 transition hover:bg-night/10 hover:text-night"
      >
        <span>{summary}</span>
        {label ? (
          <span className="font-bold text-sunset-deep">· {label}</span>
        ) : (
          <span className="text-night/40">· + תאריכים</span>
        )}
      </button>

      {/* הספירה לאחור היא מידע, לא פקד - שורה שקטה מתחת, בלי גלולה משלה */}
      {cd && cd.kind !== 'past' && (
        <span className="pointer-events-none absolute -bottom-4 end-1 whitespace-nowrap text-[11px] font-bold text-sunset-deep">
          {cd.label}
        </span>
      )}

      {open && (
        <div
          ref={panelRef}
          style={shift ? { transform: `translateX(${shift}px)` } : undefined}
          className="absolute start-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-1rem)] rounded-2xl bg-shell p-4 shadow-[var(--shadow-pop)] ring-1 ring-night/10"
        >
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

          {span !== null && mismatch === 0 && (
            <p className="mt-2.5 text-xs font-medium text-night/50">
              {span} {span === 1 ? 'יום' : 'ימים'} - בדיוק כמו בתוכנית
            </p>
          )}

          {/* אי-התאמה: אומרים אותה, ולא מתקנים אותה מאחורי הגב */}
          {mismatch > 0 && (
            <div className="mt-2.5 rounded-xl bg-sunset/10 p-2.5 ring-1 ring-sunset/25">
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
            <p className="mt-2.5 rounded-xl bg-night/5 p-2.5 text-xs font-semibold leading-relaxed text-night/70">
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
