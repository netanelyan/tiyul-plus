import { bookingIsAffiliate, buildBookingUrl } from '@/lib/booking';
import type { BookingKind } from '@/lib/trip/types';

/**
 * **המקום היחיד שבונה קישור שיוצא מהאתר.**
 *
 * ## למה מודול ולא עוד utility
 *
 * לפני זה השיוך היה מפוזר: `booking.ts` החזיק את ארבעת הספקים,
 * `viator.ts` את השיוך היחיד שבאמת עובד, ו-1,814 מקומות החזיקו כתובת
 * Google Maps **כתובה ביד בתוך הדאטה**, שנרנדרה ישירות בשלושה רכיבים.
 * המשמעות: ביום שבו יאושר תוכנית שותפים חדשה צריך לחפש בקוד איפה
 * בונים קישורים. עכשיו יש תשובה אחת.
 *
 * ## שלוש טענות שהמודול הזה אוכף
 *
 * 1. **קואורדינטות, לא שמות.** 725 מתוך 1,814 המקומות (40%) נשאו
 *    כתובת מהצורה `maps.google.com/?q=<שם באנגלית>`. חיפוש לפי שם הוא
 *    בדיוק המלכודת שכבר עלתה לפרויקט פעמיים - "Cartagena" נחת בספרד
 *    ו-"Deira" בנורת׳אמבריה - והיא חמורה יותר כשהמשתמש קורא שם בעברית
 *    ומקבל סיכה בעיר אחרת. `placeMapUrl` **מתעלם** מהכתובת השמורה
 *    כשיש קואורדינטות, ובונה מהן. זה מתקן את כל 725 בלי לגעת בדאטה.
 *
 * 2. **בלי קואורדינטות תקינות - שום קישור, לא ניחוש.** הגרסה הקודמת של
 *    המודול הזה נפלה בחזרה לכתובת השמורה (השם) כשלא היו קואורדינטות,
 *    בטענה ש"חצי קישור עדיף על כלום". **זו טעות**: חצי קישור שמנחית
 *    מישהו ברחוב הלא נכון גרוע יותר מהיעדר קישור, כי הוא נחווה כוודאות.
 *    מטייל שרואה כפתור "פתיחה ב-Google Maps" סומך עליו. `placeMapUrl`
 *    מחזירה `null` במקום, והצד שמרנדר מציג הערה קצרה ("מיקום לא אומת")
 *    במקום הכפתור - כדי שההיעדר ייראה, לא ייעלם בשקט. נכון להיום אין
 *    אף מקום כזה בקטלוג (לכולם קואורדינטות אמיתיות); זו רשת ביטחון
 *    למקום עתידי שדאטה לא יכלה לאתר בביטחון.
 *
 * 3. **`rel` נגזר מהאמת ולא מהרגל.** `sponsored` מופיע **רק** כשהקישור
 *    באמת נושא שיוך. `QuickServices` סימן `sponsored` על ארבעה קישורים
 *    שאינם שותפים כלל, וזו הצהרה שגויה כלפי גוגל וכלפי הקורא.
 *
 * ## מה נשאר בחוץ, במכוון
 *
 * קישורי הייחוס של OpenStreetMap ו-CARTO הם דרישת רישיון, לא קישור
 * מסחרי. הם לא עוברים כאן ולא יקבלו פרמטרים לעולם.
 */

/** דיוק שש ספרות אחרי הנקודה - כ-11 ס"מ, מעבר לכל צורך מיפוי. */
const COORD_PRECISION = 6;

const isGoogleMaps = (url: string): boolean => {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h === 'maps.google.com' || h === 'google.com' || h === 'www.google.com' || h.endsWith('.google.com');
  } catch {
    return false;
  }
};

/** הצורה המתועדת של גוגל לחיפוש לפי נקודה. */
export const mapsPointUrl = (lat: number, lng: number): string =>
  `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(COORD_PRECISION)},${lng.toFixed(
    COORD_PRECISION,
  )}`;

export interface LinkablePlace {
  lat?: number | null;
  lng?: number | null;
  /** מה שכתוב בדאטה. עשוי להיות שם-מבוסס, ולכן אינו מקור אמת. */
  externalUrl?: string | null;
}

/** קואורדינטה אמיתית - מספר סופי בטווח כדור הארץ, לא רק "לא NaN". */
function isUsableCoord(lat: unknown, lng: unknown): [lat: number, lng: number] | null {
  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  ) {
    return [lat, lng];
  }
  return null;
}

/**
 * הקישור החיצוני של מקום, או `null` אם אין קישור אמין לבנות.
 *
 * הסדר אינו שרירותי:
 *
 * 1. **כתובת שאינה של גוגל מנצחת** - זו כתובת שספק חיצוני החזיר
 *    (`web_url` של TripAdvisor, ערך ויקיפדיה של יעד שנחקר אוטומטית),
 *    והיא עשירה יותר מנקודה על מפה. אין טעם להחליף דף אמיתי במפה.
 * 2. **אחרת: קואורדינטות**, אם יש ותקינות. זה המסלול של כל הקטלוג
 *    המאומת - 1,814 מתוך 1,814 המקומות, נכון לכתיבת שורות אלה.
 * 3. **אחרת: `null`.** לא כתובת-שם ישנה, לא ניחוש. מקום בלי מיקום
 *    אמין מקבל היעדר קישור, לא קישור לא אמין - ראו נקודה 2 בתיעוד
 *    שלמעלה. הצד הקורא אחראי להראות שאין קישור, לא להסתיר את זה.
 */
export function placeMapUrl(place: LinkablePlace): string | null {
  const stored = typeof place.externalUrl === 'string' ? place.externalUrl : null;
  if (stored && !isGoogleMaps(stored)) return stored;

  const coord = isUsableCoord(place.lat, place.lng);
  if (coord) return mapsPointUrl(coord[0], coord[1]);
  return null;
}

/**
 * מה הקישור באמת פותח - כדי שהתווית לא תשקר.
 *
 * החלונית במפה כתבה "פתיחה ב-Google Maps" גם על ערך ויקיפדיה של מקום
 * שנחקר אוטומטית, כי היא רנדרה את `externalUrl` בעיוורון.
 */
export type OutboundTarget = 'maps' | 'wikipedia' | 'other';

export function outboundTarget(url: string | null): OutboundTarget {
  if (!url) return 'other';
  if (isGoogleMaps(url)) return 'maps';
  try {
    return new URL(url).hostname.endsWith('wikipedia.org') ? 'wikipedia' : 'other';
  } catch {
    return 'other';
  }
}

/**
 * התכונות שכל קישור יוצא נושא.
 *
 * `sponsored` **רק** כשהקישור באמת מסחרי-משויך. גוגל מתייחסת ל-
 * `sponsored` כהצהרה, ולסמן בו קישור לדף חינמי זו הצהרה לא נכונה -
 * בדיוק כמו שלא לסמן קישור שכן משויך.
 */
export function outboundAttrs(opts: { affiliate?: boolean } = {}): {
  target: '_blank';
  rel: string;
} {
  return {
    target: '_blank',
    rel: opts.affiliate ? 'noopener noreferrer nofollow sponsored' : 'noopener noreferrer nofollow',
  };
}

/**
 * קישור לספק הזמנות. עוטף את `booking.ts` כדי שלרכיבים יהיה **יבוא
 * אחד** לכל מה שיוצא החוצה, וכדי שהחלטת ה-`rel` תיפול מאותו מקום.
 *
 * ביום שתאושר תוכנית שותפים, מה שמשתנה הוא `booking.ts` בלבד - ערך
 * אחד ב-`NEXT_PUBLIC_AFFILIATE_*` וטמפלייט אחד - וכל מקום שמרנדר
 * קישור מקבל גם את הכתובת המשויכת וגם את ה-`rel` הנכון, בלי עריכה.
 */
export function partnerLink(
  kind: BookingKind,
  query = '',
  extra?: Record<string, string>,
): { url: string | null; attrs: ReturnType<typeof outboundAttrs>; affiliate: boolean } {
  const url = buildBookingUrl(kind, query, extra);
  const affiliate = bookingIsAffiliate(kind);
  return { url, attrs: outboundAttrs({ affiliate }), affiliate };
}
