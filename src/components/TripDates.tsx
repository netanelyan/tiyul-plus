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
        aria-label={
          label
            ? `תאריכי הטיול: ${label}${cd && cd.kind !== 'past' ? `, ${cd.label}` : ''}`
            : 'הוספת תאריכים לטיול'
        }
        className="badge flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-full bg-night/5 px-3 py-1 text-xs font-semibold text-night/60 transition hover:bg-night/10 hover:text-night"
      >
        <span>{summary}</span>
        {label ? (
          <span className="font-bold text-sunset-deep">· {label}</span>
        ) : (
          <span className="text-night/40">· + תאריכים</span>
        )}
        {/*
          הספירה לאחור **בתוך הצ׳יפ** ולא כשכבה מרחפת מתחתיו. הגרסה
          הקודמת הייתה `absolute -bottom-4` וריחפה בין הצ׳יפ לשורת
          הכפתורים, נקראת כשורה תלושה שנכנסת לשטח של פקד אחר (הצילום של
          נתנאל). כגלולה מלאה בתוך הצ׳יפ היא צמודה למה שהיא מתארת, ואי
          אפשר שתחפוף כלום.
        */}
        {cd && cd.kind !== 'past' && (
          <span className="rounded-full bg-sunset px-1.5 py-0.5 text-[11px] font-bold leading-none text-cream">
            {cd.label}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          style={shift ? { transform: `translateX(${shift}px)` } : undefined}
          className="absolute start-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-1rem)] rounded-2xl bg-shell p-4 shadow-[var(--shadow-pop)] ring-1 ring-night/10"
        >
          <div className="grid grid-cols-2 gap-3">
            <DateField
              label="יוצאים"
              ariaLabel="תאריך יציאה"
              value={trip.startDate}
              onChange={(v) => set('startDate', v)}
            />
            <DateField
              label="חוזרים"
              ariaLabel="תאריך חזרה"
              value={trip.endDate}
              min={trip.startDate}
              onChange={(v) => set('endDate', v)}
            />
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

/**
 * שדה תאריך שנראה כמו שדה גם כשהוא ריק.
 *
 * **הבאג שנתנאל צילם מהאייפון:** `<input type="date">` ריק ב-iOS Safari
 * מרונדר כקופסה חלקה לגמרי - בלי placeholder, בלי רמז, כלום. שני
 * מלבנים ריקים ומסתוריים בפאנל. כרום בדסקטופ דווקא מצייר שלד
 * "dd/mm/yyyy" משלו, אז אי אפשר סתם להניח טקסט מעל - הוא היה מתנגש.
 *
 * הפתרון: כשהשדה ריק, טקסט הערך של הקלט נצבע שקוף (מעלים גם את השלד
 * של כרום - אין בו מידע ממילא) ומעליו שכבת "בחירת תאריך" משלנו, זהה
 * בכל דפדפן. ברגע שיש ערך - הקלט חוזר לצבוע את עצמו. `appearance-none`
 * + `min-h` כי iOS נוטה לכווץ קלטי תאריך בלי תוכן, ו-`text-start` על
 * ה-pseudo של הערך כי iOS ממרכז אותו.
 *
 * הצד השני של אותו תיקון, בדסקטופ: כרום מצייר אינדיקטור לוח-שנה משלו
 * שהתנגש עם שכבת הרמז (יש לנו אייקון משלנו), אז הוא מוסתר - ובתמורה
 * קליק פותח את הלוח דרך `showPicker()`. ובזמן פוקוס הקלט חוזר להיות
 * גלוי (`focus:text-night`) והרמז נעלם, אחרת הקלדה ידנית של תאריך
 * הייתה בלתי נראית - שקוף זה שקוף גם בשביל מי שמקליד.
 */
function DateField({
  label,
  ariaLabel,
  value,
  min,
  onChange,
}: {
  label: string;
  ariaLabel: string;
  value?: string;
  min?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-night/50">{label}</span>
      <span className="relative block">
        <input
          type="date"
          value={value ?? ''}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => {
            // בדסקטופ, בלי אינדיקטור, קליק רק ממקד - נפתח את לוח השנה בעצמנו
            try {
              e.currentTarget.showPicker?.();
            } catch {
              /* דפדפן בלי showPicker - הקלדה עדיין עובדת */
            }
          }}
          aria-label={ariaLabel}
          className={`peer min-h-11 w-full appearance-none rounded-xl border border-night/15 bg-cream px-2.5 py-2 text-base outline-none transition [color-scheme:light] focus:border-sunset/40 focus:text-night focus:ring-4 focus:ring-sunset/15 sm:text-sm [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-date-and-time-value]:text-start ${
            value ? 'text-night' : 'text-transparent'
          }`}
        />
        {!value && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 start-2.5 flex items-center gap-1 text-sm font-medium text-night/40 peer-focus:hidden"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            בחירת תאריך
          </span>
        )}
      </span>
    </label>
  );
}
