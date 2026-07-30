/**
 * ---------- חפיפה בין תאריכי הטיול לבין מה שקורה בעיר ----------
 *
 * ## ההחלטה המרכזית: חפיפה נמדדת מול **הימים בעיר**, לא מול הטיול
 *
 * טיול של עשרה ימים ברומא ובמינכן שמתחיל ב-15 בספטמבר "חופף" לאוקטוברפסט
 * אם בודקים טווח מול טווח. אבל אם המטייל נמצא במינכן רק ביומיים הראשונים,
 * הוא לא יהיה שם כשהפסטיבל נפתח, והכרטיס היה מטעה אותו. לכן הבדיקה היא
 * **יום-יום**: לכל יום יש עיר (`TripDay.citySlug`) ותאריך שנגזר מ-
 * `startDate` (`dayDate`), ורשומה נחשבת רלוונטית רק אם יש **יום אחד לפחות
 * שבו המטייל נמצא באותה עיר ובתוך החלון**.
 *
 * שני מקרים שנופלים מזה מעצמם, וטוב שכך:
 * - טיול בלי תאריכים לא מייצר שום התראה. אין ממה לחשב, ולנחש כאן זה
 *   בדיוק ההפך ממה שהפיצ׳ר הזה בא לעשות.
 * - עיר שאין עליה רשומות פשוט לא מופיעה. "אין לנו מידע" הוא מצב
 *   לגיטימי ולא כישלון.
 */

import type { Trip } from './types';
import { dayDate, formatHebrewDate, formatHebrewRange } from './dates';

export type DateWindowKind = 'event' | 'closure';

/** תאריכים שפורסמו לשנה מסוימת */
export interface ExactDates {
  kind: 'exact';
  /** YYYY-MM-DD */
  start: string;
  end: string;
}

/** תאריך קבוע שחוזר בכל שנה (חג לאומי, יום המלך) */
export interface AnnualDates {
  kind: 'annual';
  /** MM-DD */
  start: string;
  end: string;
}

/**
 * חלון אופייני בלבד - **התאריכים לשנה הזו לא פורסמו**. הערך `typical`
 * הוא הניסוח בעברית שמוצג למשתמש ("בשבוע הראשון של אוגוסט"), והוא לעולם
 * לא מוצג בלי המשפט שאומר שאלה לא תאריכים סופיים.
 */
export interface TypicalDates {
  kind: 'typical';
  /** MM-DD - גבולות רחבים לצורך ההתאמה בלבד, לא לתצוגה */
  start: string;
  end: string;
  typical: string;
}

export interface CityDateWindow {
  id: string;
  citySlug: string;
  kind: DateWindowKind;
  name: string;
  nameLocal?: string;
  dates: ExactDates | AnnualDates | TypicalDates;
  /** שורה אחת: מה זה אומר למטייל. בלי המלצה ובלי שכנוע. */
  note: string;
  source: { title: string; url: string; /** YYYY-MM-DD */ checked: string };
}

export interface MatchedWindow {
  window: CityDateWindow;
  /** מספרי הימים בטיול (1-based) שנופלים בתוך החלון */
  dayNumbers: number[];
  /** התאריך הראשון והאחרון בטיול שנופלים בחלון (YYYY-MM-DD) */
  firstDate: string;
  lastDate: string;
}

/** האם התאריכים של הרשומה ודאיים, או רק חלון אופייני */
export const isConfirmed = (w: CityDateWindow): boolean => w.dates.kind !== 'typical';

const md = (iso: string) => iso.slice(5); // YYYY-MM-DD -> MM-DD

/**
 * האם `MM-DD` נמצא בין שני גבולות `MM-DD`, כולל.
 *
 * תומך בחלון שחוצה סוף שנה (למשל 12-20 עד 01-06): בלי זה שוק חג המולד
 * היה נעלם בדיוק בשבוע שבו מגיעים אליו רוב המטיילים.
 */
function inAnnualRange(dayMD: string, start: string, end: string): boolean {
  if (start <= end) return dayMD >= start && dayMD <= end;
  return dayMD >= start || dayMD <= end;
}

function dayInWindow(dateISO: string, w: CityDateWindow): boolean {
  const d = w.dates;
  if (d.kind === 'exact') return dateISO >= d.start && dateISO <= d.end;
  return inAnnualRange(md(dateISO), d.start, d.end);
}

/**
 * הרשומות שחופפות לטיול, לפי הכלל שבראש הקובץ.
 *
 * מוחזרות לפי סדר היום הראשון שבו הן נוגעות בטיול, כך שמי שקורא רואה
 * אותן בסדר שבו יפגוש אותן.
 */
export function matchTripWindows(
  trip: Trip | null,
  windows: CityDateWindow[],
): MatchedWindow[] {
  if (!trip?.startDate || trip.days.length === 0) return [];

  const byId = new Map<string, MatchedWindow>();

  trip.days.forEach((day, index) => {
    const date = dayDate(trip, index);
    if (!date) return;
    for (const w of windows) {
      if (w.citySlug !== day.citySlug) continue;
      if (!dayInWindow(date, w)) continue;
      const hit = byId.get(w.id);
      if (hit) {
        hit.dayNumbers.push(index + 1);
        hit.lastDate = date;
      } else {
        byId.set(w.id, { window: w, dayNumbers: [index + 1], firstDate: date, lastDate: date });
      }
    }
  });

  return [...byId.values()].sort((a, b) => a.dayNumbers[0] - b.dayNumbers[0]);
}

/**
 * כל מה ששמור על עיר, בלי קשר לתאריכים. משמש כשמישהו שואל את הסוכן
 * "מה קורה בברצלונה" בלי טיול מתוארך - התשובה עדיין מגיעה מהדאטה בלבד.
 */
export const windowsForCity = (slug: string, windows: CityDateWindow[]): CityDateWindow[] =>
  windows.filter((w) => w.citySlug === slug);

/**
 * טווח הימים בטיול כטקסט קצר: "יום 5" או "ימים 5-7".
 *
 * הימים נבדקים על רציפות ולא רק על קצוות: טיול שחוזר לאותה עיר בסוף
 * ייתן [2, 9], ו-"ימים 2-9" היה אומר שמונה ימים שלא היו.
 */
/**
 * הנוסח לחלון שהתאריכים שלו לא פורסמו.
 *
 * **זה המשפט הכי חשוב בפיצ׳ר הזה.** הוא מופיע במקום שבו אחרת היה מוצג
 * תאריך, ולכן הוא לא הערת שוליים ולא כתב קטן: מי שקורא "בדרך כלל
 * בשבוע הראשון של אוגוסט" ורואה מיד אחריו שהתאריכים לא פורסמו, יודע
 * בדיוק כמה מזה לתכנן.
 */
export const typicalLabel = (typical: string) =>
  `בדרך כלל ${typical} · התאריכים לשנה הזו עדיין לא פורסמו`;

/**
 * שורת התאריכים לתצוגה. השנה נלקחת מהיום בטיול שאליו הרשומה נוגעת,
 * כך שתאריך שנתי-חוזר מוצג בשנה שבה המטייל באמת שם.
 */
export function windowDatesLabel(match: MatchedWindow): string {
  const d = match.window.dates;
  if (d.kind === 'exact') return formatHebrewRange(d.start, d.end);
  if (d.kind === 'typical') return typicalLabel(d.typical);
  const year = Number(match.firstDate.slice(0, 4));
  // חלון שחוצה סוף שנה מסתיים בשנה שאחריה
  const endYear = d.start <= d.end ? year : year + 1;
  return formatHebrewRange(`${year}-${d.start}`, `${endYear}-${d.end}`);
}

/** "מקור: X · נבדק ב-30 ביולי" - מוצג לצד כל רשומה, ודאית או לא */
export const sourceLabel = (w: CityDateWindow) =>
  `מקור: ${w.source.title} · נבדק ב-${formatHebrewDate(w.source.checked)}`;

export function dayRangeLabel(days: number[]): string {
  if (days.length === 0) return '';
  if (days.length === 1) return `יום ${days[0]}`;
  const contiguous = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  return contiguous ? `ימים ${days[0]}-${days[days.length - 1]}` : `ימים ${days.join(', ')}`;
}
