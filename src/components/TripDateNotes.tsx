'use client';

import { useMemo } from 'react';
import { cityDateWindows } from '@/data/dateWindows';
import {
  dayRangeLabel,
  isConfirmed,
  matchTripWindows,
  sourceLabel,
  windowDatesLabel,
} from '@/lib/trip/dateWindows';
import type { Trip } from '@/lib/trip/types';

/**
 * "מה קורה בתאריכים שלכם" - מה שהתאריכים של הטיול נופלים עליו.
 *
 * ## שלוש החלטות עיצוב שהן בעצם החלטות תוכן
 *
 * 1. **משני למסלול.** אין רקע צבעוני, אין מסגרת מודגשת ואין אייקון
 *    אזהרה. הפאנל יושב מתחת לתוכנית, בגוונים של הטקסט השקט שכבר קיים
 *    במסך. המסלול הוא מה שהמטייל בא לראות.
 * 2. **סגירה היא מידע ולא התראה.** אין משולש צהוב ואין "שימו לב":
 *    התווית אומרת "סגירות", והשורה אומרת מה סגור. אזהרה גורמת לאנשים
 *    לשנות תוכניות בגלל הטון ולא בגלל העובדה.
 * 3. **אין קריאה לפעולה.** אין כרטיסים, אין "כדאי ללכת", אין קישור
 *    לספק. הקישור היחיד הוא **המקור**, כדי שאפשר יהיה לבדוק אותנו.
 *
 * כשאין מה לדווח הרכיב לא מרנדר כלום - לא כותרת ולא "אין אירועים".
 * מסך ריק מכותרת חסרת תוכן הוא בדיוק "משני".
 */
export default function TripDateNotes({ trip }: { trip: Trip }) {
  const matches = useMemo(() => matchTripWindows(trip, cityDateWindows), [trip]);
  if (matches.length === 0) return null;

  return (
    <section className="mt-5" aria-label="מה קורה בתאריכים של הטיול">
      <h3 className="px-1 text-xs font-bold text-night/45">מה קורה בתאריכים שלכם</h3>
      <ul className="mt-1.5 space-y-1.5">
        {matches.map((match) => {
          const w = match.window;
          const confirmed = isConfirmed(w);
          return (
            <li key={w.id} className="rounded-2xl bg-shell px-3 py-2.5 ring-1 ring-night/10">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-sm font-bold text-night">{w.name}</span>
                <span className="rounded-full bg-night/[0.06] px-2 py-0.5 text-[11px] font-semibold text-night/55">
                  {w.kind === 'closure' ? 'סגירות' : 'אירוע'}
                </span>
                <span className="text-[11px] font-semibold text-night/45">
                  {dayRangeLabel(match.dayNumbers)} בטיול
                </span>
              </div>

              {/*
                שורת התאריכים. כשהם לא ודאיים היא נושאת את המשפט המלא
                ("בדרך כלל ... · התאריכים לשנה הזו עדיין לא פורסמו")
                באותו גודל בדיוק - כדי שההסתייגות לא תהיה כתב קטן.
              */}
              <p
                className={`mt-1 text-xs font-semibold leading-relaxed ${
                  confirmed ? 'text-night/75' : 'text-night/55'
                }`}
              >
                {windowDatesLabel(match)}
              </p>

              <p className="mt-1 text-xs font-medium leading-relaxed text-night/55">{w.note}</p>

              <p className="mt-1.5 text-[11px] font-medium text-night/40">
                <a
                  href={w.source.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="underline decoration-night/20 underline-offset-2 transition hover:text-night/70"
                >
                  {sourceLabel(w)}
                </a>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
