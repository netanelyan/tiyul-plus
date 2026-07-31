import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';

/**
 * שרת בלבד - **פירוק תיבת החיפוש של אזור הניהול**.
 *
 * נתנאל: *"תתייחס לתיבת החיפוש כאל קלט עוין. זה החלק באתר שהכי שווה
 * לתקוף."* הוא צודק: זו התיבה היחידה במוצר שמאחוריה יושבת גישה
 * לנתונים של כולם.
 *
 * ## ההחלטה המרכזית: המחרוזת של המשתמש לא נכנסת לשום שאילתה
 *
 * לא "מקודדת היטב" ולא "מסוננת" - **לא נכנסת**. שלושת מצבי החיפוש
 * מומרים כאן לערכים שהשרת עצמו מכיר, ורק הם ממשיכים הלאה:
 *
 * | מה הוקלד | מה ממשיך לדאטהבייס |
 * |---|---|
 * | מייל | uuid שקיבלנו מ-GoTrue אחרי התאמה **מדויקת** |
 * | יעד/מדינה | slug מהקטלוג שלנו - רשימה סגורה בקוד |
 * | שם טיול | **כלום** - הסינון נעשה בזיכרון על שורות שכבר נשלפו |
 *
 * כלומר גם אם `pgrest.ts` היה נשבר מחר, אין כאן ערוץ: אין מחרוזת
 * משתמש שמגיעה לשאילתה. `pgrest` נשאר השכבה השנייה, לא הראשונה.
 *
 * ## מה עוד נחסם כאן
 *
 * אורך (חיפוש הוא לא ערוץ להעלאת נתונים), תווי בקרה, ותווים כלליים
 * של LIKE. האחרונים מיותרים טכנית - הסינון בזיכרון ממילא - אבל הם
 * יורדים כדי שהתנהגות החיפוש תהיה צפויה ולא תבנית שהמשתמש מריץ.
 */

/** אורך מרבי לשאילתה. שם טיול ארוך במיוחד בקטלוג הוא ~40 תווים. */
export const MAX_QUERY_CHARS = 80;

export type AdminQuery =
  | { kind: 'email'; email: string }
  | { kind: 'place'; slugs: string[]; label: string }
  | { kind: 'name'; needle: string }
  | { kind: 'invalid'; why: string };

/** מייל בצורתו בלבד - לא ולידציה מלאה, רק "זה נראה כמו כתובת" */
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;

/**
 * נירמול לחיפוש טקסט: הורדת רווחים כפולים, ניקוד לטיני, ותווים
 * כלליים. **לא** מסיר עברית ולא מסיר תווים "מוזרים" - שם של טיול
 * יכול להכיל כל דבר, והחיפוש נעשה בזיכרון ולכן אין מה להגן עליו שם.
 */
export function normalizeNeedle(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[%_*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** כל שמות היעדים והמדינות, פעם אחת. זו הרשימה הסגורה. */
const PLACES: { slug: string; label: string; names: string[]; countrySlug?: string }[] = [
  ...destinations.map((d) => ({
    slug: d.slug,
    label: d.name,
    names: [d.name, d.nameLocal ?? '', d.slug].filter(Boolean).map(normalizeNeedle),
  })),
  ...countries.map((c) => ({
    slug: c.slug,
    label: c.name,
    names: [c.name, c.nameLocal ?? '', c.slug].filter(Boolean).map(normalizeNeedle),
    countrySlug: c.slug,
  })),
];

/** יעדי הקטלוג לפי מדינה - כדי שחיפוש "איטליה" ימצא את רומא וונציה */
const BY_COUNTRY = new Map<string, string[]>();
for (const d of destinations) {
  BY_COUNTRY.set(d.countrySlug, [...(BY_COUNTRY.get(d.countrySlug) ?? []), d.slug]);
}

/**
 * הפירוק. `mode` מגיע מהממשק ולא מהטקסט, כדי שחיפוש שם טיול שנראה
 * כמו מייל לא ייקרא בטעות כחיפוש מייל.
 */
export function parseAdminQuery(raw: unknown, mode: unknown): AdminQuery {
  if (typeof raw !== 'string') return { kind: 'invalid', why: 'לא טקסט' };
  const text = raw.trim();
  if (!text) return { kind: 'invalid', why: 'ריק' };
  if (text.length > MAX_QUERY_CHARS) return { kind: 'invalid', why: 'ארוך מדי' };
  // תווי בקרה לא מגיעים משום מסלול לגיטימי
  if (/[\u0000-\u001f\u007f]/.test(text)) return { kind: 'invalid', why: 'תווי בקרה' };

  if (mode === 'email') {
    const email = text.toLowerCase();
    if (!EMAIL.test(email)) return { kind: 'invalid', why: 'לא נראה כמו כתובת מייל' };
    return { kind: 'email', email };
  }

  if (mode === 'place') {
    /*
      **רשימה סגורה.** הטקסט מומר ל-slug מהקטלוג שלנו או נדחה; אין
      מסלול שבו מחרוזת חופשית הופכת לתנאי חיפוש.
    */
    const needle = normalizeNeedle(text);
    if (!needle) return { kind: 'invalid', why: 'ריק' };
    const hit =
      PLACES.find((p) => p.names.some((n) => n === needle)) ??
      PLACES.find((p) => p.names.some((n) => n.includes(needle)));
    if (!hit) return { kind: 'invalid', why: 'לא נמצא יעד או מדינה בשם הזה' };
    const slugs = hit.countrySlug ? (BY_COUNTRY.get(hit.countrySlug) ?? []) : [hit.slug];
    return { kind: 'place', slugs, label: hit.label };
  }

  if (mode === 'name') {
    const needle = normalizeNeedle(text);
    if (needle.length < 2) return { kind: 'invalid', why: 'קצר מדי' };
    return { kind: 'name', needle };
  }

  return { kind: 'invalid', why: 'מצב חיפוש לא מוכר' };
}

/** התאמת שם בזיכרון - אותו נירמול משני הצדדים */
export const nameMatches = (tripName: string, needle: string): boolean =>
  normalizeNeedle(tripName).includes(needle);
