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
import { OFFLINE_HINT } from '@/lib/offline/online';

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
/** שם קריא לאתר המקור, מתוך הכתובת עצמה - בלי טבלה שתתיישן */
function siteLabel(url: string): string {
  const host = (url.split('/')[2] ?? '').replace(/^www\./, '');
  if (host.includes('budgetyourtrip')) return 'Budget Your Trip';
  if (host.includes('nomadicmatt')) return 'Nomadic Matt';
  return host || 'מקור';
}

export default function TripCost({
  trip,
  destinations,
  onSetPreferences,
  offline = false,
}: {
  trip: Trip;
  destinations: Destination[];
  onSetPreferences: (patch: Partial<TripPreferences>) => void;
  /**
   * המספרים עצמם שמורים במכשיר (הם חלק מהבילד), ולכן הם **נקראים
   * גם בלי רשת** - וזה בדיוק המצב שבו רוצים לדעת כמה עולה יום כאן.
   * מה שנחסם: בחירת סגנון נסיעה (כתיבה לטיול) והמעבר לאתר המקור.
   * תאריך הבדיקה מוצג כרגיל - הוא הדבר שהופך מספר שמור למספר ישן
   * ולא למספר שקרי.
   */
  offline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const style = trip.preferences?.travelStyle;

  const cities = useMemo(() => {
    const map: Record<string, CostCity> = {};
    for (const d of destinations)
      map[d.slug] = { name: d.name, dailyCost: d.dailyCost, dailyBudget: d.dailyBudget };
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

  // מקור אחד לכל אתר שבשימוש, עם קישור לדף של העיר הראשונה שהגיעה
  // ממנו. שני מקורות בטיול אחד הוא מצב רגיל כאן, ולכן אסור להציג
  // קישור אחד כאילו הוא מכסה את כל השורות.
  const sources = (() => {
    const out: { url: string; label: string }[] = [];
    for (const line of result.lines) {
      const label = siteLabel(line.source.url);
      if (!out.some((s) => s.label === label)) out.push({ url: line.source.url, label });
    }
    return out;
  })();

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
                  title={offline ? OFFLINE_HINT : s.hint}
                  disabled={offline}
                  onClick={() =>
                    onSetPreferences({ travelStyle: active ? undefined : s.id })
                  }
                  className={`min-w-0 flex-1 rounded-xl px-2 py-2 text-xs font-semibold ring-1 transition disabled:cursor-not-allowed disabled:opacity-45 ${
                    active
                      ? 'bg-sunset text-cream ring-sunset'
                      : 'bg-cream text-night/70 ring-night/15 enabled:hover:ring-night/30'
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
              : offline
                ? 'בלי חיבור אי אפשר לבחור סגנון נסיעה. הסכומים יופיעו כשהחיבור יחזור.'
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
                    {/* נתון ברמת המדינה נאמר בשורה עצמה - הוא גס יותר
                        מהיעד, ואסור שייקרא כמו מדידה של אותה עיר. */}
                    {line.scope === 'country' && (
                      <span className="text-xs text-night/40">נתון ברמת המדינה</span>
                    )}
                    <span className="ms-auto text-night/70">
                      {line.upperBoundOnly && <span className="text-xs text-night/40">עד </span>}
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
                {/* למה דווקא "בנוח" חסר בהרבה ערים - אחרת זה נראה כמו תקלה */}
                {style === 'comfort' && result.missing.length > 0 && (
                  <p className="mt-1 text-xs text-night/45">
                    לסגנון "בנוח" יש נתון רק בחלק מהערים: המקור הרחב יותר מפרסם מדרגה
                    עליונה פתוחה, ואי אפשר לגזור ממנה מספר בלי לינה.
                  </p>
                )}
              </div>

              <p className="mt-3 text-xs leading-relaxed text-night/55">
                כך מוציאים מטיילים בערים האלה בדרך כלל, לאדם ליום. זו לא תחזית להוצאות
                שלכם. <span className="font-semibold text-night/70">בלי טיסות ובלי לינה.</span>
                {/* ההסבר על משמעות הטווח נכון רק לשורות שנבנו מחיבור
                    שורות הקטגוריות. לשורה שהמקור שלה פרסם טווח מוכן,
                    המשפט הזה פשוט לא נכון - ולכן הוא מותנה. */}
                {result.bases.length === 1 && result.bases[0] === 'components'
                  ? ' הקצה התחתון הוא תחבורה מקומית ואוכל; העליון מוסיף גם כניסות ואטרקציות.'
                  : ' הטווח הוא כפי שהמקור מוסר אותו לכל עיר.'}
                {result.hasUpperBound && ' בעיר אחת לפחות הנתון הוא חסם עליון ("עד"), לא טווח.'}
              </p>
              <p className="mt-1 text-xs text-night/40">
                נבדק ב־{checkedLabel} ·{' '}
                {/* מקור לכל עיר, ולא קישור אחד שמתחזה לכסות את כולן */}
                {/* בלי רשת המקור נאמר בשם ולא כקישור: קישור שנלחץ ולא
                    נפתח נראה כמו אתר שבור, ושם המקור הוא המידע החשוב. */}
                {sources.map((s, i) => (
                  <span key={s.url}>
                    {i > 0 && ' · '}
                    {offline ? (
                      <span className="text-night/45">{s.label}</span>
                    ) : (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="underline decoration-night/20 underline-offset-2 hover:text-night/60"
                      >
                        {s.label}
                      </a>
                    )}
                  </span>
                ))}
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
