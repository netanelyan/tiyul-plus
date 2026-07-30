// ---------- שכבת ההזמנות (booking) ----------
//
// כלל הברזל של הקובץ הזה: **הסוכן לעולם לא מייצר קישורים**. המודל מחליט
// רק *על מה* לדבר (טיסות? לינה? כרטיסים?) ושומר את התשובה של המשתמש דרך
// הכלי set_booking_status. הקישור עצמו מורכב כאן, דטרמיניסטית, מהקונפיג
// שלמטה - כך שאי אפשר להמציא כתובת, מזהה שותפים או מחיר.
//
// כנות מסחרית (נשמר מ-services.ts): נכון להיום אין בקוד אף שילוב
// אפיליאייט אמיתי. כל עוד `affiliate` הוא null, הכפתור מפנה לאתר הציבורי
// של הספק - בלי פרמטרי מעקב מומצאים. כשיגיע מזהה שותפים אמיתי, ממלאים
// את `affiliate` (תבנית + שם משתנה סביבה) ושום קומפוננטה לא משתנה.

import type { BookingKind } from './trip/types';

export type { BookingKind };

/**
 * מזהי שותפים. חייבים להיקרא כגישה סטטית ל-`process.env.NEXT_PUBLIC_*`
 * כדי ש-Next יטמיע אותם גם בצד הלקוח (גישה דינמית לפי מפתח לא עוברת
 * הטמעה ותמיד תחזיר undefined בדפדפן). כולם ריקים היום - ראו הקובץ
 * `.env.example`; ברגע שיש מזהה אמיתי מוסיפים אותו שם ובוורסל.
 */
const AFFILIATE_IDS: Record<string, string | undefined> = {
  skyscanner: process.env.NEXT_PUBLIC_AFFILIATE_SKYSCANNER,
  booking: process.env.NEXT_PUBLIC_AFFILIATE_BOOKING,
  getyourguide: process.env.NEXT_PUBLIC_AFFILIATE_GETYOURGUIDE,
  airalo: process.env.NEXT_PUBLIC_AFFILIATE_AIRALO,
};

export interface BookingAffiliate {
  /** תבנית הקישור. {ID} = מזהה השותפים, {QUERY} = יעד/עיר מקודדים ל-URL. */
  template: string;
  /** המפתח ב-AFFILIATE_IDS. ריק/חסר => נופלים ל-publicUrl. */
  idKey: keyof typeof AFFILIATE_IDS;
  /**
   * האם התבנית היא **עטיפת הפניה** (רשת שותפים שמקבלת את היעד האמיתי
   * מקודד בתוך פרמטר, למשל `awin1.com/cread.php?...&ued=<encoded>`).
   *
   * זה לא פרט טכני שאפשר לדלג עליו: פרמטרים של חיפוש (תאריכים, אורחים)
   * חייבים לשבת על **כתובת היעד**, ולהדביק אותם על העטיפה פירושו לשלוח
   * אותם לרשת השותפים ולא לספק - כלומר קישור שנראה ממולא ומגיע לחיפוש
   * ריק. כשמוסיפים ספק עטוף, מסמנים כאן true והפרמטרים לא יצורפו.
   */
  wrapped?: boolean;
}

export interface BookingProvider {
  kind: BookingKind;
  emoji: string;
  /** כותרת בעברית */
  title: string;
  /** משפט קצר בעברית - מה זה נותן למטייל */
  blurb: string;
  /** תווית הכפתור */
  cta: string;
  /** שאלת הסוכן - נוסח קצר ולא דוחף, לשימוש חד-פעמי */
  question: string;
  /** שם הספק להצגה; null = עוד לא נבחר ספק ("בקרוב") */
  provider: string | null;
  affiliate: BookingAffiliate | null;
  /**
   * חיפוש ציבורי אצל הספק. {QUERY} מוחלף בשם היעד באנגלית/לטינית.
   * בלי {QUERY} - זה פשוט דף הבית של הספק.
   * null => אין ספק => הכרטיס במצב "בקרוב".
   */
  publicUrl: string | null;
}

export const bookingProviders: BookingProvider[] = [
  {
    kind: 'flights',
    emoji: '✈️',
    title: 'טיסות',
    blurb: 'השוואת מחירים לטיסות מנתב"ג ליעד.',
    cta: 'חיפוש טיסות',
    question: 'כבר יש לכם טיסות ליעד, או שכדאי שאזכיר לחפש?',
    provider: 'Skyscanner',
    affiliate: null,
    // דף הבית בלבד: קישור-עומק לטיסה דורש קודי שדה תעופה שאין בדאטה,
    // ולא נמציא פורמט כתובת.
    publicUrl: 'https://www.skyscanner.co.il/',
  },
  {
    kind: 'stay',
    emoji: '🏨',
    title: 'לינה',
    blurb: 'מלונות ודירות באזור הימים שתכננתם.',
    cta: 'חיפוש לינה',
    question: 'סגרתם לינה, או שתרצו שאפנה אתכם לחיפוש?',
    provider: 'Booking.com',
    affiliate: null,
    publicUrl: 'https://www.booking.com/searchresults.html?ss={QUERY}',
  },
  {
    kind: 'activities',
    emoji: '🎟️',
    title: 'כרטיסים ופעילויות',
    blurb: 'דילוגי תור, סיורים וחוויות - להזמין מראש.',
    cta: 'חיפוש חוויות',
    question: 'רוצים שאסמן אילו אטרקציות במסלול כדאי להזמין מראש?',
    provider: 'GetYourGuide',
    affiliate: null,
    publicUrl: 'https://www.getyourguide.com/s/?q={QUERY}',
  },
  {
    kind: 'esim',
    emoji: '📶',
    title: 'eSIM וגלישה',
    blurb: 'חבילת גלישה מקומית - מופעלת עוד לפני הנחיתה.',
    cta: 'חיפוש eSIM',
    question: 'יש לכם פתרון גלישה לחו"ל, או שנסתכל על eSIM?',
    provider: 'Airalo',
    affiliate: null,
    // דף הבית: ה-slug של כל מדינה אצל הספק לא מתועד אצלנו.
    publicUrl: 'https://www.airalo.com/',
  },
  {
    kind: 'insurance',
    emoji: '🛡️',
    title: 'ביטוח נסיעות',
    blurb: 'כיסוי רפואי וביטול - לפי אורך הטיול והפעילויות.',
    cta: 'בקרוב',
    question: 'דאגתם לביטוח נסיעות?',
    provider: null,
    affiliate: null,
    publicUrl: null, // ספק עדיין לא נבחר - מצב "בקרוב" מכוון
  },
  {
    kind: 'car',
    emoji: '🚗',
    title: 'השכרת רכב',
    blurb: 'רכב לימי הטיול - חופש לצאת מחוץ לעיר.',
    cta: 'בקרוב',
    question: 'המסלול יוצא מחוץ לעיר - תרצו שנבדוק רכב?',
    provider: null,
    affiliate: null,
    publicUrl: null, // ספק עדיין לא נבחר
  },
];

export const bookingProvider = (kind: BookingKind): BookingProvider | undefined =>
  bookingProviders.find((p) => p.kind === kind);

/**
 * מרכיב את הקישור היוצא. דטרמיניסטי לחלוטין: אין כאן שום קלט מהמודל
 * מלבד סוג ההזמנה, והיעד מגיע מהדאטה המקומית של הטיול.
 *
 * @param query שם היעד לחיפוש אצל הספק (לטיני, למשל "Rome"). ריק => דף הבית.
 * @param params פרמטרי חיפוש נוספים (תאריכים, אורחים). מצורפים **רק**
 *   לכתובת חיפוש אמיתית: בלי יעד אין מה לסנן, ולעטיפת הפניה של רשת
 *   שותפים הם היו נשלחים לכתובת הלא נכונה (ראו `BookingAffiliate.wrapped`).
 *   כל הערכים כאן נגזרים מהטיול, לא מהמודל - ראו `bookingSearch.ts`.
 * @returns כתובת, או null אם אין עדיין ספק (מצב "בקרוב").
 */
export function buildBookingUrl(
  kind: BookingKind,
  query?: string,
  params?: Record<string, string>,
): string | null {
  const p = bookingProvider(kind);
  if (!p) return null;

  const q = encodeURIComponent((query ?? '').trim());

  /** מצרף פרמטרים בעזרת URL API, כדי שקידוד ותווים מיוחדים לא ייכתבו ביד */
  const withParams = (url: string, allow: boolean): string => {
    if (!allow || !params || !q) return url;
    const entries = Object.entries(params).filter(([, v]) => v);
    if (entries.length === 0) return url;
    const u = new URL(url);
    for (const [k, v] of entries) u.searchParams.set(k, v);
    return u.toString();
  };

  if (p.affiliate) {
    const id = AFFILIATE_IDS[p.affiliate.idKey];
    // בלי מזהה אמיתי אין קישור אפיליאייט - לא ממציאים אחד
    if (id) {
      const url = p.affiliate.template.replace('{ID}', id).replace('{QUERY}', q);
      return withParams(url, !p.affiliate.wrapped);
    }
  }

  if (!p.publicUrl) return null;
  if (!p.publicUrl.includes('{QUERY}')) return p.publicUrl;
  // בלי יעד לחיפוש - חוזרים לשורש האתר במקום לשלוח חיפוש ריק
  if (!q) return new URL(p.publicUrl).origin;
  return withParams(p.publicUrl.replace('{QUERY}', q), true);
}

/** האם הספק כבר קיים (יש לאן להפנות) או שהכרטיס במצב "בקרוב" */
export const bookingAvailable = (kind: BookingKind): boolean =>
  buildBookingUrl(kind) !== null;

/** האם הקישור הוא אפיליאייט אמיתי (משפיע על rel של הלינק ועל הגילוי הנאות) */
export function bookingIsAffiliate(kind: BookingKind): boolean {
  const p = bookingProvider(kind);
  return Boolean(p?.affiliate && AFFILIATE_IDS[p.affiliate.idKey]);
}

export const BOOKING_STATUS_LABELS: Record<'have' | 'need' | 'not_needed', string> = {
  have: 'כבר סגור',
  need: 'עוד צריך',
  not_needed: 'לא רלוונטי',
};
