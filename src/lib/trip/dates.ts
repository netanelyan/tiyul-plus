import type { Trip } from './types';

/**
 * תאריכים לטיול.
 *
 * ## הכלל היחיד שכל הקובץ נשען עליו: תאריך הוא `YYYY-MM-DD`, לא רגע בזמן.
 *
 * `new Date('2026-08-12')` נקרא כחצות **UTC**. בישראל זה עדיין ה-12,
 * אבל בכל אזור זמן ממערב לגריניץ׳ זה ה-11 - כלומר עצם ההצגה של תאריך
 * הייתה מזיזה אותו ביום אחורה למי שגולש מניו יורק. לכן אין כאן שום
 * `new Date(string)`: מפרקים את המחרוזת לשלושה מספרים ובונים תאריך
 * מקומי בצהריים, שאין שעון קיץ שיזיז אותו מעבר לגבול היום.
 *
 * שמות החודשים והימים כתובים כאן ולא מגיעים מ-`Intl`, כדי שהתצוגה
 * תהיה עברית גם אם ה-runtime נבנה בלי נתוני ICU מלאים - ובעיקר כדי
 * שהטסטים יבדקו מחרוזת אחת ידועה ולא את גרסת ה-ICU של המכונה.
 */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTHS = [
  'בינואר', 'בפברואר', 'במרץ', 'באפריל', 'במאי', 'ביוני',
  'ביולי', 'באוגוסט', 'בספטמבר', 'באוקטובר', 'בנובמבר', 'בדצמבר',
];
const MONTHS_BARE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];
/** getDay(): 0=ראשון */
const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export function isISODate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = value.match(ISO);
  if (!m) return false;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), 12);
  // דוחה 2026-02-31 וחבריו: הבנייה "מגלגלת" למרץ, וזה ייראה תקין
  return (
    date.getFullYear() === Number(y) &&
    date.getMonth() === Number(mo) - 1 &&
    date.getDate() === Number(d)
  );
}

/** `YYYY-MM-DD` → Date מקומי בצהריים (ראו ההסבר למעלה) */
export function parseISODate(value: string): Date | null {
  if (!isISODate(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function toISODate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function addDays(iso: string, n: number): string | null {
  const d = parseISODate(iso);
  if (!d) return null;
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** מספר הימים שהטווח מכסה, כולל שני הקצוות. null אם אחד מהם לא תקין. */
export function rangeDays(startDate?: string, endDate?: string): number | null {
  const a = startDate ? parseISODate(startDate) : null;
  const b = endDate ? parseISODate(endDate) : null;
  if (!a || !b) return null;
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  return diff >= 0 ? diff + 1 : null;
}

/** התאריך של יום מספר `index` (0-based) בטיול, לפי תאריך היציאה */
export function dayDate(trip: Pick<Trip, 'startDate'>, index: number): string | null {
  return trip.startDate ? addDays(trip.startDate, index) : null;
}

export interface FormatOpts {
  /** "שלישי, 12 באוגוסט" מול "12 באוגוסט" */
  weekday?: boolean;
  /** להוסיף שנה כשהיא אינה השנה הנוכחית */
  year?: boolean;
}

export function formatHebrewDate(iso: string, opts: FormatOpts = {}): string {
  const d = parseISODate(iso);
  if (!d) return '';
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const withYear = opts.year ? `${base} ${d.getFullYear()}` : base;
  return opts.weekday ? `${WEEKDAYS[d.getDay()]}, ${withYear}` : withYear;
}

/**
 * טווח קריא: "12-18 באוגוסט", ובחציית חודש "28 באוגוסט - 3 בספטמבר".
 * חוצה שנה - מוסיף את השנה לשני הקצוות.
 */
export function formatHebrewRange(startDate?: string, endDate?: string): string {
  const a = startDate ? parseISODate(startDate) : null;
  if (!a) return '';
  const b = endDate ? parseISODate(endDate) : null;
  if (!b || toISODate(a) === toISODate(b)) return formatHebrewDate(startDate!);
  if (a.getFullYear() !== b.getFullYear()) {
    return `${formatHebrewDate(startDate!, { year: true })} - ${formatHebrewDate(endDate!, { year: true })}`;
  }
  if (a.getMonth() === b.getMonth()) {
    // אותו חודש: "12-18 באוגוסט" - שם החודש פעם אחת
    return `${a.getDate()}-${b.getDate()} ${MONTHS[a.getMonth()]}`;
  }
  return `${formatHebrewDate(startDate!)} - ${formatHebrewDate(endDate!)}`;
}

/** שם החודש בלי ה-ב׳ ("אוגוסט") - לכותרות */
export function hebrewMonth(iso: string): string {
  const d = parseISODate(iso);
  return d ? MONTHS_BARE[d.getMonth()] : '';
}

export type Countdown =
  | { kind: 'future'; days: number; label: string }
  | { kind: 'today'; label: string }
  | { kind: 'during'; day: number; label: string }
  | { kind: 'past'; label: string };

/**
 * ספירה לאחור. `today` נמסר כפרמטר ולא נקרא מ-`Date.now()` בפנים, כדי
 * שהטסט יוכל לקבע יום - ובעיקר כדי שלא ייווצר רינדור שתלוי בשעון בזמן
 * hydration (השרת והלקוח יכולים להיות בימים שונים).
 */
export function countdown(
  todayISO: string,
  startDate?: string,
  endDate?: string,
): Countdown | null {
  if (!startDate || !isISODate(startDate) || !isISODate(todayISO)) return null;
  const today = parseISODate(todayISO)!;
  const start = parseISODate(startDate)!;
  const end = endDate && isISODate(endDate) ? parseISODate(endDate)! : start;
  const toStart = Math.round((start.getTime() - today.getTime()) / 86_400_000);
  const toEnd = Math.round((end.getTime() - today.getTime()) / 86_400_000);

  if (toStart > 0) {
    if (toStart === 1) return { kind: 'future', days: 1, label: 'יוצאים מחר' };
    return { kind: 'future', days: toStart, label: `עוד ${toStart} ימים לטיול` };
  }
  if (toStart === 0) return { kind: 'today', label: 'יוצאים היום' };
  if (toEnd >= 0) return { kind: 'during', day: 1 - toStart, label: `יום ${1 - toStart} בטיול` };
  return { kind: 'past', label: 'הטיול הסתיים' };
}

/** התאריך של היום, כמחרוזת ISO מקומית */
export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

/**
 * ההשלמה שהופכת "טווח" לנוח: מי שנתן קצה אחד בלבד מקבל את השני לפי
 * מספר הימים שכבר יש בטיול, כך שברירת המחדל תמיד עקבית עם התוכנית.
 * **לא נוגע בימים עצמם** - התאמה של אורך הטיול היא פעולה מפורשת
 * של המשתמש, לא תופעת לוואי של בחירת תאריך (ראו TripDates).
 */
export function completeRange(
  dayCount: number,
  startDate?: string,
  endDate?: string,
): { startDate?: string; endDate?: string } {
  const span = Math.max(1, dayCount) - 1;
  const s = startDate && isISODate(startDate) ? startDate : undefined;
  const e = endDate && isISODate(endDate) ? endDate : undefined;
  if (s && !e) return { startDate: s, endDate: addDays(s, span) ?? undefined };
  if (!s && e) return { startDate: addDays(e, -span) ?? undefined, endDate: e };
  if (s && e && rangeDays(s, e) === null) return { startDate: s, endDate: addDays(s, span) ?? undefined };
  return { startDate: s, endDate: e };
}

/**
 * תקינות תאריכים שמגיעים מבחוץ - הסוכן, קישור משותף, אחסון ישן.
 * מה שלא `YYYY-MM-DD` תקין נופל בשקט, וטווח הפוך מאבד את הסוף במקום
 * לשמור מצב שאי אפשר להציג.
 */
export function safeDates(t: { startDate?: unknown; endDate?: unknown }): {
  startDate?: string;
  endDate?: string;
} {
  const startDate = isISODate(t.startDate) ? t.startDate : undefined;
  const endDate = isISODate(t.endDate) ? t.endDate : undefined;
  if (startDate && endDate && rangeDays(startDate, endDate) === null) return { startDate };
  if (!startDate && endDate) return {};
  return { startDate, endDate };
}
