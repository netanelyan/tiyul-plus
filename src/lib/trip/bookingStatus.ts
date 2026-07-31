import { bookingIsPerCity, bookingProviders } from '@/lib/booking';
import type { BookingKind, BookingStatus, Trip, TripPreferences } from './types';

/**
 * קריאה וכתיבה של מצב ההזמנות - **מימוש אחד** לפאנל ולסוכן.
 *
 * ## מה השתנה ולמה
 *
 * עד עכשיו לכל סוג הזמנה היה מצב אחד לטיול. נתנאל ראה את זה במסך:
 * בטיול של ברטיסלבה ווינה מוצג מלון אחד לכל הערים. **"יש לנו לינה"
 * הוא משפט שאי אפשר לענות עליו נכון בטיול רב-ערים** - הוא נכון לעיר
 * אחת ולא לשנייה. לינה וכרטיסים נשמרים עכשיו לפי עיר; טיסה, eSIM,
 * ביטוח ורכב נשארים לטיול, כי הם באמת לטיול.
 *
 * ## התאימות לאחור היא הדבר העדין כאן
 *
 * טיולים קיימים - ב-localStorage ובחשבונות - נושאים `booking.stay`
 * בודד. שלוש התנהגויות, בסדר הזה:
 *
 * 1. **קריאה**: אין רשומה לעיר ⇒ נופלים לערך הישן. טיול שסומן "כבר
 *    סגור" ממשיך להיראות סגור בכל עיר, ולא מתאפס בשקט.
 * 2. **כתיבה ראשונה**: הערך הישן **נפרס לכל ערי הטיול** ורק אז חלה
 *    העריכה, והמפתח הישן נמחק. בלי זה, כיבוי סטטוס בעיר אחת היה
 *    "נופל" בחזרה לערך הישן ונראה כאילו הלחיצה לא נקלטה.
 * 3. **מחיקה**: לחיצה חוזרת על אותו סטטוס מנקה את העיר הזו בלבד.
 *
 * הפריסה קורית בכתיבה ולא בטעינה בכוונה: היא נשמרת עם הטיול בדרך
 * שהמשתמש יזם, ואין מסלול שבו טעינה בלבד משנה נתונים על הדיסק.
 */

/** הסוגים ששייכים לעיר, לפי הקונפיג */
export const PER_CITY_KINDS: BookingKind[] = bookingProviders
  .filter((p) => bookingIsPerCity(p.kind))
  .map((p) => p.kind);

/** הסוגים ששייכים לטיול כולו */
export const TRIP_WIDE_KINDS: BookingKind[] = bookingProviders
  .filter((p) => !bookingIsPerCity(p.kind))
  .map((p) => p.kind);

/**
 * הסטטוס להצגה. `citySlug` נדרש לסוג עירוני; בלעדיו מוחזר `undefined`
 * ולא ניחוש, כי "המלון של איזו עיר" היא שאלה בלי תשובה ברירת-מחדל.
 */
export function bookingStatusOf(
  prefs: TripPreferences | undefined,
  kind: BookingKind,
  citySlug?: string,
): BookingStatus | undefined {
  if (!bookingIsPerCity(kind)) return prefs?.booking?.[kind];
  if (!citySlug) return undefined;
  return prefs?.bookingByCity?.[kind]?.[citySlug] ?? prefs?.booking?.[kind];
}

/**
 * הפעלה/כיבוי של סטטוס. מחזיר **טלאי** להעדפות, לא טיול - אותה חתימה
 * שהפאנל והסוכן כבר עובדים איתה.
 *
 * לחיצה על הסטטוס שכבר פעיל מנקה אותו, בדיוק כמו קודם.
 */
export function toggleBookingStatus(
  prefs: TripPreferences | undefined,
  kind: BookingKind,
  status: BookingStatus,
  opts: { citySlug?: string; citySlugs: string[] },
): Pick<TripPreferences, 'booking' | 'bookingByCity'> {
  return writeBookingStatus(prefs, kind, status, { ...opts, toggle: true });
}

/**
 * קביעה, בלי כיבוי. זה מה שהסוכן משתמש בו: המטייל אמר "יש לנו מלון
 * בווינה", וסימון חוזר של אותו ערך חייב להישאר "יש" - לא להתהפך.
 * הכיבוי הוא מחווה של ממשק ולא של שיחה.
 */
export function setBookingStatus(
  prefs: TripPreferences | undefined,
  kind: BookingKind,
  status: BookingStatus,
  opts: { citySlug?: string; citySlugs: string[] },
): Pick<TripPreferences, 'booking' | 'bookingByCity'> {
  return writeBookingStatus(prefs, kind, status, { ...opts, toggle: false });
}

function writeBookingStatus(
  prefs: TripPreferences | undefined,
  kind: BookingKind,
  status: BookingStatus,
  opts: { citySlug?: string; citySlugs: string[]; toggle: boolean },
): Pick<TripPreferences, 'booking' | 'bookingByCity'> {
  const booking = { ...(prefs?.booking ?? {}) };
  const byCity: NonNullable<TripPreferences['bookingByCity']> = {
    ...(prefs?.bookingByCity ?? {}),
  };

  if (!bookingIsPerCity(kind)) {
    if (opts.toggle && booking[kind] === status) delete booking[kind];
    else booking[kind] = status;
    return { booking, bookingByCity: byCity };
  }

  const { citySlug, citySlugs } = opts;
  if (!citySlug) return { booking, bookingByCity: byCity };

  // הפריסה החד-פעמית של הערך הישן, לפני שנוגעים במשהו
  const legacy = booking[kind];
  const cities: Record<string, BookingStatus> = { ...(byCity[kind] ?? {}) };
  if (legacy !== undefined) {
    for (const slug of citySlugs) if (cities[slug] === undefined) cities[slug] = legacy;
    delete booking[kind];
  }

  if (opts.toggle && cities[citySlug] === status) delete cities[citySlug];
  else cities[citySlug] = status;

  byCity[kind] = cities;
  return { booking, bookingByCity: byCity };
}

/**
 * כמה פריטים עדיין פתוחים ("עוד צריך") - התג בכותרת הסעיף.
 *
 * סוג עירוני נספר **פעם אחת לעיר**: שני מלונות חסרים בטיול של שתי
 * ערים הם שני דברים לעשות, לא אחד.
 */
export function openBookingCount(trip: Trip | null): number {
  if (!trip) return 0;
  const prefs = trip.preferences;
  let n = 0;
  for (const kind of TRIP_WIDE_KINDS) if (bookingStatusOf(prefs, kind) === 'need') n += 1;
  for (const kind of PER_CITY_KINDS) {
    for (const slug of trip.citySlugs) {
      if (bookingStatusOf(prefs, kind, slug) === 'need') n += 1;
    }
  }
  return n;
}

/** אילו ערים עדיין פתוחות לסוג מסוים - לתווית קצרה על הכרטיס */
export function citiesNeeding(trip: Trip | null, kind: BookingKind): string[] {
  if (!trip || !bookingIsPerCity(kind)) return [];
  return trip.citySlugs.filter((slug) => bookingStatusOf(trip.preferences, kind, slug) === 'need');
}
