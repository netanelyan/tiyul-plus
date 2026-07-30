// ---------- חיפוש מוכן אצל ספק (לינה / חוויות) ----------
//
// ## הכלל שכל הקובץ הזה קיים בשבילו
//
// כשמטייל מבקש עזרה במלון או בכרטיסים, התשובה היא **חיפוש אמיתי אצל
// ספק אמיתי, עם הפרטים שלו כבר ממולאים** - ולא מספרים, שמות מלונות או
// טענות זמינות מהמודל. לכן:
//
// - **אין כאן שום קלט טקסטואלי או מספרי מהמודל.** הכלי `booking_search`
//   מקבל מהמודל שני דברים בלבד: איזה סוג חיפוש, ואיזו עיר. כל השאר -
//   תאריכים, מספר אורחים, תקציב, כשרות - נגזר מ-`Trip` (מה שהמטייל
//   בעצמו אמר או בחר בממשק) ומהדאטה שלנו.
// - **המודל לא יכול להקליד מספר גם אם ירצה**, כי אין פרמטר מספרי בכלי.
//   זה לא איסור בפרומפט אלא היעדר שדה.
// - הכתובת עצמה מורכבת ב-`src/lib/booking.ts`, מהקונפיג, כמו כל קישור
//   הזמנה אחר באתר.
//
// ## מסעדות אינן כאן, בכוונה
//
// אוכל נשאר הקטלוג האצור שלנו (עם מידע הכשרות והסתייגויותיו) ובלי שום
// חיפוש מחירים. `SearchKind` הוא איחוד סגור של שניים, כך שאין ערך
// שאפשר להעביר בו "מסעדה".
//
// ## מה לא נשלח לספק, ולמה
//
// נשלחים רק פרמטרים שהספקים עצמם מייצרים בכתובות החיפוש הציבוריות
// שלהם. **פילטר מחיר לא נשלח**: הפורמט שלו אצל Booking אינו מתועד
// (`nflt=...`), וניחוש פורמט כתובת הוא בדיוק מה שהפרויקט הזה כבר שילם
// עליו ביוקר. במקום זה התקציב שהמטייל אמר מוצג על הכרטיס כטקסט, עם
// שורה שאומרת שהסינון נעשה באתר הספק. פרמטר שגוי היה נכשל בשקט
// (הספק פשוט מתעלם) - ועדיין מציג למטייל "מסונן לפי התקציב שלך",
// כלומר הבטחה שלא התקיימה.

import { buildBookingUrl, bookingIsAffiliate, bookingProvider } from './booking';
import { addDays, dayDate, formatHebrewRange } from './trip/dates';
import type { Trip, TripPreferences } from './trip/types';

/** שני סוגי החיפוש שהסוכן יכול לפתוח. מסעדות אינן ברשימה - ראו למעלה. */
export type SearchKind = 'stay' | 'activities';

export const SEARCH_KINDS: SearchKind[] = ['stay', 'activities'];

/**
 * מה שהמשתמש רואה. נבנה **כולו בשרת** מהטיול ומהדאטה, ונשלח מוכן
 * ללקוח - כדי שלרינדור לא תהיה שום דרך להוסיף מספר משלו.
 */
export interface BookingSearchCard {
  kind: SearchKind;
  /** כותרת הכרטיס בעברית */
  title: string;
  /** תווית הכפתור */
  cta: string;
  /** שם הספק, לתצוגה לצד הכפתור */
  provider: string;
  url: string;
  /** קישור שותפים אמיתי (משפיע על rel ועל נוסח הגילוי הנאות) */
  isAffiliate: boolean;
  cityLabel: string;
  /** "מה הבנתי מהבקשה" - כל צ׳יפ נגזר מהטיול, אף אחד לא מהמודל */
  understood: string[];
  /** מה לא נכנס לכתובת ולכן נקבע באתר הספק */
  onProvider: string[];
}

const KIND_COPY: Record<SearchKind, { title: string; cta: string }> = {
  // אין כאן "הזול ביותר" ואין "המחיר הטוב ביותר": אנחנו לא סורקים את כל
  // הספקים ולא יכולים לטעון טענה כזאת. ראו הטסט ב-priceGuard.test.ts
  // שסורק את כל הקוד ומוודא שהנוסח הזה לא חוזר פנימה.
  stay: { title: 'חיפוש מלונות ולינה', cta: 'פתיחת החיפוש' },
  activities: { title: 'חיפוש כרטיסים, סיורים וחוויות', cta: 'פתיחת החיפוש' },
};

const BUDGET_LABEL: Record<'low' | 'medium' | 'high', string> = {
  low: 'תקציב חסכוני',
  medium: 'תקציב בינוני',
  high: 'תקציב מרווח',
};

/**
 * טווח השהייה **בעיר מסוימת**, נגזר מסדר הימים בטיול.
 *
 * זה הלב של "כבר ממולא": בטיול רב-ערים, תאריכי הצ׳ק-אין בווינה הם
 * התאריכים של הימים שבאמת בווינה - לא תאריכי הטיול כולו. הגזירה היא
 * מ-`startDate` + מספר היום, בדיוק כמו בכל מקום אחר באתר, ולכן היא לא
 * יכולה לצאת מסנכרון עם סדר הימים.
 *
 * צ׳ק-אאוט הוא **היום שאחרי** היום האחרון בעיר: מי שישן שם בלילה של
 * יום 8 עוזב ב-9. שלושה ימים בעיר הם שלושה לילות, וזה מה שהספק מצפה לו.
 */
export function cityStayRange(
  trip: Trip | null,
  citySlug: string,
): { checkIn: string; checkOut: string } | null {
  if (!trip?.startDate) return null;
  const indexes = trip.days
    .map((d, i) => (d.citySlug === citySlug ? i : -1))
    .filter((i) => i >= 0);
  if (indexes.length === 0) return null;
  const checkIn = dayDate(trip, indexes[0]);
  const lastDay = dayDate(trip, indexes[indexes.length - 1]);
  if (!checkIn || !lastDay) return null;
  const checkOut = addDays(lastDay, 1);
  return checkOut ? { checkIn, checkOut } : null;
}

/**
 * מספר המבוגרים, **רק כשהוא חד-משמעי**.
 *
 * `party` הוא הסימן היחיד שיש לנו, והוא לא תמיד אומר מספר: "חברים" יכול
 * להיות שניים או חמישה, ו"משפחה" לא אומר כמה ילדים. במקרים האלה לא
 * שולחים כלום והכרטיס אומר שמספר האורחים נקבע אצל הספק - עדיף על
 * להמציא למישהו שני ילדים.
 */
export function adultsFromParty(party: TripPreferences['party']): number | null {
  if (party === 'solo') return 1;
  if (party === 'couple') return 2;
  return null;
}

/**
 * הפרמטרים שנשלחים לספק. שמות הפרמטרים הם אלה שהספקים עצמם מייצרים
 * בכתובות החיפוש שלהם, ובכוונה **המינימום**: יעד, תאריכים, אורחים.
 *
 * לא אומת ברשת מהסביבה הזאת (booking.com ו-getyourguide חסומים כאן),
 * ולכן מה שנבחר הוא הסט שנכשל בבטחה: פרמטר שהספק לא מכיר פשוט מתעלמים
 * ממנו והמטייל מקבל חיפוש פחות ממולא - לא טענה שגויה. אימות אמיתי הוא
 * לחיצה אחת על הכפתור מרשת רגילה.
 */
function providerParams(
  kind: SearchKind,
  range: { checkIn: string; checkOut: string } | null,
  adults: number | null,
): Record<string, string> {
  if (kind !== 'stay') return {}; // ל-GetYourGuide רק `q` מאומת אצלנו
  const params: Record<string, string> = {};
  if (range) {
    params.checkin = range.checkIn;
    params.checkout = range.checkOut;
  }
  if (adults) params.group_adults = String(adults);
  return params;
}

/**
 * בונה את הכרטיס. דטרמיניסטי לגמרי: אותו טיול + אותה עיר + אותו סוג
 * מחזירים תמיד אותה כתובת ואותם צ׳יפים.
 *
 * @param cityQuery השם הלטיני של העיר מהדאטה שלנו (למשל "Rome")
 * @param cityLabel השם בעברית לתצוגה
 */
export function buildSearchCard(
  trip: Trip | null,
  kind: SearchKind,
  citySlug: string,
  cityQuery: string,
  cityLabel: string,
  extra: { kosher?: boolean; accessible?: boolean } = {},
): BookingSearchCard | null {
  const provider = bookingProvider(kind);
  if (!provider?.provider) return null; // ספק לא נבחר - אין מה להציג

  const range = cityStayRange(trip, citySlug);
  const prefs = trip?.preferences ?? {};
  const adults = adultsFromParty(prefs.party);
  const url = buildBookingUrl(kind, cityQuery, providerParams(kind, range, adults));
  if (!url) return null;

  const understood: string[] = [cityLabel];
  const onProvider: string[] = [];

  if (kind === 'stay') {
    if (range) understood.push(formatHebrewRange(range.checkIn, range.checkOut));
    else onProvider.push('תאריכים');
    if (adults) understood.push(adults === 1 ? 'נוסע אחד' : `${adults} מבוגרים`);
    else onProvider.push('מספר אורחים');
  }

  // התקציב מוצג כמה שהמטייל אמר, ולא מסונן בכתובת - ראו ההסבר בראש הקובץ
  const budget = prefs.budget;
  if (budget) {
    understood.push(BUDGET_LABEL[budget]);
    onProvider.push('סינון לפי מחיר');
  }
  // כשרות ונגישות: אין לספקים פרמטר מתועד שאנחנו מכירים, ולכן הם נאמרים
  // כאילוץ שהובן - ומסומנים במפורש כמשהו שמסננים באתר. הבטחה שאנחנו לא
  // יכולים לקיים בכתובת לא תיכתב כאילו קוימה.
  const kosher = extra.kosher ?? prefs.kosher;
  if (kosher) {
    understood.push('מטבח כשר');
    onProvider.push('סינון כשרות');
  }
  if (extra.accessible) {
    understood.push('נגישות');
    onProvider.push('סינון נגישות');
  }

  return {
    kind,
    title: KIND_COPY[kind].title,
    cta: KIND_COPY[kind].cta,
    provider: provider.provider,
    url,
    isAffiliate: bookingIsAffiliate(kind),
    cityLabel,
    understood,
    onProvider,
  };
}

/**
 * הגילוי הנאות. **חובה, לא אופציונלי** - מוצג על כל כרטיס חיפוש.
 *
 * הנוסח נכון בשני המצבים: כל עוד אין מזהה שותפים בסביבה הקישור מפנה
 * לאתר הציבורי ואנחנו לא מקבלים כלום, ולכן "עשויים" - ולא "מקבלים".
 */
export const SEARCH_DISCLOSURE =
  'הקישור מוביל לאתר הזמנות חיצוני, ואנחנו עשויים לקבל עמלה - זה לא משפיע על מה שאנחנו מציעים. המחיר והזמינות נקבעים שם.';
