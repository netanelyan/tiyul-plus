'use client';

import { useMemo, useState } from 'react';
import {
  TRAVEL_STYLES,
  formatRange,
  tripCost,
  type CostCity,
} from '@/lib/trip/cost';
import { formatHebrewDate } from '@/lib/trip/dates';
import type { Trip, TripPreferences } from '@/lib/trip/types';
import type { Destination } from '@/lib/types';

/**
 * "כמה מוציאים כאן ביום" - הצד הדטרמיניסטי של העלות.
 *
 * הרכיב הזה לא יודע להעריך כלום. הוא מקבל נתונים שמורים, קורא ל-
 * `tripCost` שעושה חיבור וכפל, ומצייר את התוצאה. **המודל לא נוגע
 * באף מספר כאן** - לא מייצר, לא מתקן ולא מתאר אותו; אין לו אפילו
 * כלי שמזיז את סגנון הנסיעה (ראו `TripPreferences.travelStyle`).
 *
 * שלוש החלטות תצוגה ששוות אמירה:
 * 1. **בלי סגנון נבחר לא מוצג שום מספר.** ברירת מחדל "ביניים" הייתה
 *    הנחה על התקציב של אדם שלא אמר עליו כלום.
 * 2. **עיר בלי נתון מופיעה בשם ובלי מספר**, והסכום מסומן כחלקי. עיר
 *    שנשמטת בשקט הופכת סכום חלקי לסכום שקרי.
 * 3. הסכומים ב-LTR מבודד. שני מספרים שנפגשים בשורה RTL נדבקים - זה
 *    בדיוק הבאג של "יום 110 באוגוסט" מפיצ׳ר התאריכים.
 */
export default function TripCost({
  trip,
  destinations,
  onSetPreferences,
}: {
  trip: Trip;
  destinations: Destination[];
  onSetPreferences: (patch: Partial<TripPreferences>) => void;
}) {
  const [open, setOpen] = useState(false);
  const style = trip.preferences?.travelStyle;

  const cities = useMemo(() => {
    const map: Record<string, CostCity> = {};
    for (const d of destinations) map[d.slug] = { name: d.name, dailyCost: d.dailyCost };
    return map;
  }, [destinations]);

  // מחושב תמיד על 'mid' כשאין בחירה, רק כדי לדעת אם יש בכלל מה להציג.
  const result = useMemo(
    () => tripCost(trip, style ?? 'mid', cities),
    [trip, style, cities],
  );

  // אין ולו עיר אחת עם נתון - הרכיב לא מופיע בכלל. עדיף כלום מ"אין מידע".
  if (result.lines.length === 0) return null;

  const checkedLabel =
    result.checked.length === 1
      ? formatHebrewDate(result.checked[0], { year: true })
      : `${formatHebrewDate(result.checked[0])} - ${formatHebrewDate(result.checked[result.checked.length - 1], { year: true })}`;

  const headline = style
    ? result.totals
        .map((c) => formatRange(c.low, c.high, c.currency))
        .join(' · ')
    : 'בחירת סגנון נסיעה';

  return (
    <section className="mt-4 rounded-2xl bg-shell ring-1 ring-night/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-start"
      >
        <span className="text-sm font-semibold text-night/80">כמה מוציאים ביום</span>
        <span className="min-w-0 flex-1 truncate text-xs text-night/50">
          {style ? (
            <span dir="ltr" className="inline-block">
              {headline}
            </span>
          ) : (
            headline
          )}
          {style && !result.complete && ' · חלקי'}
        </span>
        <span className={`text-night/40 transition-transform ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="border-t border-night/10 px-4 py-4">
          {/* ---------- סגנון הנסיעה: נבחר פעם אחת, ידנית ---------- */}
          <div className="flex gap-2">
            {TRAVEL_STYLES.map((s) => {
              const active = style === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={active}
                  title={s.hint}
                  onClick={() =>
                    onSetPreferences({ travelStyle: active ? undefined : s.id })
                  }
                  className={`min-w-0 flex-1 rounded-xl px-2 py-2 text-xs font-semibold ring-1 transition ${
                    active
                      ? 'bg-sunset text-cream ring-sunset'
                      : 'bg-cream text-night/70 ring-night/15 hover:ring-night/30'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* ההסבר של הסגנון מופיע רק לזה שנבחר: שלושה הסברים במקביל
              הפכו את הבלוק השקט הזה לרועש יותר מהמסלול עצמו. */}
          <p className="mt-2 text-xs leading-relaxed text-night/55">
            {style
              ? TRAVEL_STYLES.find((s) => s.id === style)?.hint
              : 'בוחרים סגנון אחד, ורואים כמה מוציאים מטיילים בערים של הטיול הזה ביום רגיל.'}
          </p>

          {style && (
            <>
              <ul className="mt-4 space-y-1.5">
                {result.lines.map((line) => (
                  <li
                    key={line.citySlug}
                    className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
                  >
                    <span className="font-semibold text-night/80">{line.cityName}</span>
                    <span className="text-xs text-night/40">
                      {line.days === 1 ? 'יום אחד' : `${line.days} ימים`}
                    </span>
                    <span className="ms-auto text-night/70">
                      <span dir="ltr" className="inline-block">
                        {formatRange(line.perDayLow, line.perDayHigh, line.currency)}
                      </span>
                      <span className="text-xs text-night/40"> ליום</span>
                    </span>
                  </li>
                ))}

                {/* עיר בלי נתון: נאמרת בשם, בלי מספר ובלי הערכה */}
                {result.missing.map((m) => (
                  <li
                    key={m.citySlug}
                    className="flex flex-wrap items-baseline gap-x-2 text-sm text-night/45"
                  >
                    <span className="font-semibold">{m.cityName}</span>
                    <span className="text-xs">
                      {m.days === 1 ? 'יום אחד' : `${m.days} ימים`}
                    </span>
                    <span className="ms-auto text-xs">אין לנו נתון</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 border-t border-night/10 pt-3">
                {/* תווית אחת, ואחריה סכום לכל מטבע - לא שורה שלמה שחוזרת */}
                <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-semibold text-night">
                    {result.complete ? 'לכל הטיול' : 'לערים שיש להן נתון'}
                  </span>
                  <span className="ms-auto font-semibold text-night" dir="ltr">
                    {result.totals
                      .map((c) => formatRange(c.low, c.high, c.currency))
                      .join(' · ')}
                  </span>
                </div>
                {result.totals.length > 1 && (
                  <p className="mt-1 text-xs text-night/45">
                    הטיול עובר בין מטבעות, ולכן יש סכום לכל מטבע בנפרד.
                  </p>
                )}
                {!result.complete && (
                  <p className="mt-1 text-xs text-night/55">
                    הסכום חלקי: {result.missing.map((m) => m.cityName).join(', ')} לא נכלל
                    בו.
                  </p>
                )}
              </div>

              <p className="mt-3 text-xs leading-relaxed text-night/55">
                כך מוציאים מטיילים בערים האלה בדרך כלל, לאדם ליום. זו לא תחזית להוצאות
                שלכם. <span className="font-semibold text-night/70">בלי טיסות ובלי לינה.</span>{' '}
                הקצה התחתון הוא תחבורה מקומית ואוכל; העליון מוסיף גם כניסות ואטרקציות.
              </p>
              <p className="mt-1 text-xs text-night/40">
                נבדק ב־{checkedLabel} ·{' '}
                <a
                  href={result.lines[0].source.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="underline decoration-night/20 underline-offset-2 hover:text-night/60"
                >
                  Budget Your Trip
                </a>
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
