/**
 * ---------- מה קורה בתאריכים של המטייל ----------
 *
 * הדאטה היא `src/data/calendar.ts` (`CalendarEntry`) - לוח האירועים
 * והסגירות של האתר. הקובץ הזה הוא **רק ההתאמה והתצוגה**: מה מהלוח נוגע
 * לטיול הזה, ואיך אומרים את זה בלי להפוך חלון משוער לתאריך.
 *
 * ## ההחלטה המרכזית: חפיפה נמדדת מול **הימים בעיר**, לא מול הטיול
 *
 * טיול של עשרה ימים ברומא ובמינכן שמתחיל ב-15 בספטמבר "חופף" לאוקטוברפסט
 * אם בודקים טווח מול טווח. אבל אם המטייל נמצא במינכן רק ביומיים הראשונים
 * הוא לא יהיה שם כשהפסטיבל נפתח, והכרטיס היה מטעה אותו. לכן הבדיקה היא
 * **יום-יום**: לכל יום יש עיר ותאריך שנגזר מ-`startDate`, ורשומה נחשבת
 * רלוונטית רק אם יש יום אחד לפחות שבו המטייל נמצא בתחום שלה ובתוך החלון.
 *
 * רשומה חלה על יום אם היא מכוונת ל**יעד** של אותו יום, או שהיא ברמת
 * **מדינה** (`destinationSlugs` ריק) ומדינת היעד תואמת.
 *
 * ## שתי רשימות, כי יש שתי דרגות ודאות - ואסור לערבב
 *
 * - `dated`   - `datesConfirmed: true`. יש טווחי תאריכים אמיתיים, והחפיפה
 *               מחושבת עליהם. מוצג כתאריך.
 * - `windows` - `datesConfirmed: false`. **אין תאריכים בכלל בדאטה**, רק
 *               תיאור מילולי. אי אפשר לחשב חפיפה, ולכן הן לא מוצגות
 *               כ"חופף לימים 3-5" אלא כ"החלון האופייני, התאריכים לשנה
 *               הזו לא פורסמו" - וזה בדיוק מה שהן.
 */

import type { CalendarEntry } from '@/lib/types';
import type { Trip } from './types';
import { dayDate, formatHebrewRange } from './dates';

/** מיפוי מינימלי של עיר → מדינה. מגיע מהערים של הטיול, לא מהקטלוג. */
export interface CityCountry {
  slug: string;
  countrySlug: string;
}

export interface DatedMatch {
  entry: CalendarEntry;
  /** מספרי הימים בטיול (1-based) שנופלים בתוך אחד מטווחי הרשומה */
  dayNumbers: number[];
  /** הטווח שנפגש בפועל, לתצוגה */
  range: { start: string; end: string };
}

export interface WindowMatch {
  entry: CalendarEntry;
  /** באיזו עיר בטיול הרשומה נוגעת (לתצוגה) */
  cityLabel?: string;
}

export interface TripCalendar {
  dated: DatedMatch[];
  windows: WindowMatch[];
}

/* ---------- התאמת תחום ---------- */

function appliesTo(entry: CalendarEntry, citySlug: string, countrySlug: string): boolean {
  const scoped = entry.destinationSlugs ?? [];
  if (scoped.length > 0) return scoped.includes(citySlug);
  return entry.countrySlug === countrySlug;
}

/* ---------- חודשים מתוך תיאור מילולי ---------- */

const MONTH_WORDS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

/**
 * אילו חודשים מוזכרים בתיאור המילולי של חלון לא-מאושר.
 *
 * **זו הערכה, והיא משמשת אך ורק כדי להחליט אם להציג את הרשומה** - אף
 * פעם לא כדי להציג תאריך. הטקסט עצמו מוצג מילה במילה כפי שנכתב.
 *
 * "ינואר עד מרץ" נפרש כשלושה חודשים ולא כשניים: המילה "עד" (או מקף)
 * בין שני חודשים היא טווח, ובלי המילוי הזה פברואר היה נופל בין הכיסאות.
 * כשאי אפשר לזהות שום חודש - הרשומה **לא** מוצגת. עדיף להחמיץ חלון
 * משוער מאשר להראות לכל טיול את כל מה ששמור על המדינה.
 */
export function monthsInWindow(text: string): number[] {
  const found: { month: number; at: number; range: boolean }[] = [];
  MONTH_WORDS.forEach((w, i) => {
    let from = 0;
    for (;;) {
      const at = text.indexOf(w, from);
      if (at < 0) break;
      const before = text.slice(Math.max(0, at - 12), at);
      found.push({ month: i + 1, at, range: /(עד|מ-|–|—|\bעד\b)\s*$/.test(before) });
      from = at + w.length;
    }
  });
  if (found.length === 0) return [];
  found.sort((a, b) => a.at - b.at);

  const months = new Set<number>();
  found.forEach((f, idx) => {
    months.add(f.month);
    if (f.range && idx > 0) {
      // ממלאים מהחודש הקודם עד זה, כולל מעבר שנה (נובמבר עד ינואר)
      let m = found[idx - 1].month;
      for (let guard = 0; guard < 12 && m !== f.month; guard++) {
        m = (m % 12) + 1;
        months.add(m);
      }
    }
  });
  return [...months].sort((a, b) => a - b);
}

/* ---------- ההתאמה ---------- */

export function matchTripCalendar(
  trip: Trip | null,
  entries: CalendarEntry[],
  cities: CityCountry[],
): TripCalendar {
  if (!trip?.startDate || trip.days.length === 0) return { dated: [], windows: [] };

  const countryOf = new Map(cities.map((c) => [c.slug, c.countrySlug]));
  const dated = new Map<string, DatedMatch>();
  /** חודש -> הערים שהמטייל נמצא בהן באותו חודש */
  const monthCities = new Map<number, Set<string>>();

  trip.days.forEach((day, index) => {
    const date = dayDate(trip, index);
    const country = countryOf.get(day.citySlug);
    if (!date || !country) return;

    const month = Number(date.slice(5, 7));
    if (!monthCities.has(month)) monthCities.set(month, new Set());
    monthCities.get(month)!.add(day.citySlug);

    for (const entry of entries) {
      if (!entry.datesConfirmed || !entry.dates?.length) continue;
      if (!appliesTo(entry, day.citySlug, country)) continue;
      const range = entry.dates.find((r) => date >= r.start && date <= r.end);
      if (!range) continue;
      const hit = dated.get(entry.id);
      if (hit) hit.dayNumbers.push(index + 1);
      else dated.set(entry.id, { entry, dayNumbers: [index + 1], range });
    }
  });

  // חלונות לא-מאושרים: אין להם תאריכים, ולכן ההתאמה היא ברמת חודש+עיר
  const windows: WindowMatch[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    if (entry.datesConfirmed || !entry.window) continue;
    if (seen.has(entry.id)) continue;
    const months = monthsInWindow(entry.window);
    if (months.length === 0) continue;
    const hitCity = months
      .flatMap((m) => [...(monthCities.get(m) ?? [])])
      .find((slug) => appliesTo(entry, slug, countryOf.get(slug) ?? ''));
    if (!hitCity) continue;
    seen.add(entry.id);
    windows.push({ entry, cityLabel: hitCity });
  }

  return {
    dated: [...dated.values()].sort((a, b) => a.dayNumbers[0] - b.dayNumbers[0]),
    windows,
  };
}

/* ---------- תצוגה ---------- */

/**
 * הנוסח לחלון שהתאריכים שלו לא פורסמו.
 *
 * **המשפט הכי חשוב בפיצ׳ר הזה.** הוא מופיע במקום שבו אחרת היה תאריך,
 * ולכן הוא לא הערת שוליים ולא כתב קטן.
 */
export const NOT_PUBLISHED = 'התאריכים לשנה הזו עדיין לא פורסמו';

/** התאריכים של רשומה מאושרת, כטווח קריא */
export const datedLabel = (m: DatedMatch) => formatHebrewRange(m.range.start, m.range.end);

/** "מקור: X · נבדק ב-30 ביולי" */
export const sourceLabel = (entry: CalendarEntry) =>
  `מקור: ${entry.source.title} · נבדק ב-${hebrewShort(entry.source.checked)}`;

function hebrewShort(iso: string): string {
  const r = formatHebrewRange(iso, iso);
  return r || iso;
}

export const impactLabel = (entry: CalendarEntry): string =>
  entry.kind === 'closure' || entry.impact === 'closures'
    ? 'סגירות'
    : entry.impact === 'both'
      ? 'אירוע · סגירות'
      : 'אירוע';

/**
 * טווח הימים בטיול כטקסט קצר: "יום 5" או "ימים 5-7".
 *
 * הימים נבדקים על רציפות ולא רק על קצוות: טיול שחוזר לאותה עיר בסוף
 * ייתן [2, 9], ו-"ימים 2-9" היה אומר שמונה ימים שלא היו.
 */
export function dayRangeLabel(days: number[]): string {
  if (days.length === 0) return '';
  if (days.length === 1) return `יום ${days[0]}`;
  const contiguous = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  return contiguous ? `ימים ${days[0]}-${days[days.length - 1]}` : `ימים ${days.join(', ')}`;
}
