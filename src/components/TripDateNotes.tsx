'use client';

import { useMemo } from 'react';
import { calendar } from '@/data/calendar';
import {
  NOT_PUBLISHED,
  datedLabel,
  dayRangeLabel,
  impactLabel,
  matchTripCalendar,
  sourceLabel,
} from '@/lib/trip/dateWindows';
import PanelSection from '@/components/PanelSection';
import type { Trip } from '@/lib/trip/types';
import type { CalendarEntry, Destination } from '@/lib/types';

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
 * שתי הרשימות מופרדות ויזואלית ולא רק בטקסט: מה שיש לו תאריך מוצג עם
 * התאריך ועם הימים שהוא נוגע בהם, ומה שאין לו מוצג תחת כותרת משלו
 * שאומרת מראש שאלה חלונות ולא תאריכים.
 *
 * כשאין מה לדווח הרכיב לא מרנדר כלום - לא כותרת ולא "אין אירועים".
 * מסך ריק מכותרת חסרת תוכן הוא בדיוק "משני".
 */
export default function TripDateNotes({
  trip,
  destinations,
}: {
  trip: Trip;
  /** הערים של הטיול בלבד - מהן נגזרת המדינה, בלי לייבא את הקטלוג ללקוח */
  destinations: Destination[];
}) {
  const { dated, windows } = useMemo(
    () =>
      matchTripCalendar(
        trip,
        calendar,
        destinations.map((d) => ({ slug: d.slug, countrySlug: d.countrySlug })),
      ),
    [trip, destinations],
  );

  if (dated.length === 0 && windows.length === 0) return null;

  return (
    <PanelSection
      panelKey="dates"
      icon="📅"
      title="מה קורה בתאריכים שלכם"
      className="print:hidden"
      ariaLabel="מה קורה בתאריכים של הטיול"
    >
      <ul className="space-y-1.5">
        {dated.map((m) => (
          <Row
            key={m.entry.id}
            entry={m.entry}
            dates={datedLabel(m)}
            confirmed
            meta={`${dayRangeLabel(m.dayNumbers)} בטיול`}
          />
        ))}
      </ul>

      {windows.length > 0 && (
        <>
          <h4 className="mt-3 px-1 text-[11px] font-semibold text-night/40">
            נופל בערך על התאריכים שלכם · {NOT_PUBLISHED}
          </h4>
          <ul className="mt-1.5 space-y-1.5">
            {windows.map((w) => (
              <Row
                key={w.entry.id}
                entry={w.entry}
                dates={w.entry.window ?? ''}
                confirmed={false}
              />
            ))}
          </ul>
        </>
      )}
    </PanelSection>
  );
}

function Row({
  entry,
  dates,
  confirmed,
  meta,
}: {
  entry: CalendarEntry;
  dates: string;
  confirmed: boolean;
  meta?: string;
}) {
  return (
    <li className="rounded-2xl bg-shell px-3 py-2.5 ring-1 ring-night/10">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-sm font-bold text-night">{entry.name}</span>
        <span className="rounded-full bg-night/[0.06] px-2 py-0.5 text-[11px] font-semibold text-night/55">
          {impactLabel(entry)}
        </span>
        {meta && <span className="text-[11px] font-semibold text-night/45">{meta}</span>}
      </div>

      {/*
        שורת התאריכים. בחלון לא-מאושר זהו התיאור המילולי כפי שנכתב
        בדאטה, מילה במילה - לא נגזר ממנו תאריך ולא מוצג מספר.
      */}
      <p
        className={`mt-1 text-xs font-semibold leading-relaxed ${
          confirmed ? 'text-night/75' : 'text-night/55'
        }`}
      >
        {dates}
      </p>

      <p className="mt-1 text-xs font-medium leading-relaxed text-night/55">{entry.note}</p>

      <p className="mt-1.5 text-[11px] font-medium text-night/40">
        <a
          href={entry.source.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="underline decoration-night/20 underline-offset-2 transition hover:text-night/70"
        >
          {sourceLabel(entry)}
        </a>
      </p>
    </li>
  );
}
