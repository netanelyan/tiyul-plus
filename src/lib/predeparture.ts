import { countdown } from '@/lib/trip/dates';
import type { Trip } from '@/lib/trip/types';

/**
 * "בדיקה לפני הנסיעה" - המוצר הראשון בתשלום באתר.
 *
 * קובץ משותף (לקוח + שרת), **בלי שום סוד**: מחיר, זיהוי המוצר, חלון
 * ההצעה וצורת הדו"ח. המחיר נקבע **כאן בלבד** ונקרא רק מהשרת בפועל
 * (`server/paypal.ts` בונה את ההזמנה מהקבוע הזה) - הלקוח מציג אותו
 * לצורך תצוגה, ואף בקשה שיוצאת מהדפדפן לא נושאת סכום.
 *
 * ## למה זה לא tier ולא מנוי
 *
 * זו רכישה חד-פעמית **לטיול ספציפי**, לא הרשאה שמשתנה מ-`free` ל-
 * `premium`. אין לזה קשר ל-`Plan`/`Tier` ב-`lib/plans.ts` ואסור שיהיה -
 * שום פיצ'ר קיים לא נבדק מול המוצר הזה.
 */

export const PRODUCT_ID = 'predeparture-check';

/** ₪29.90, החלטת נתנאל. שתי ספרות אחרי הנקודה - זה מה ש-PayPal מצפה לו ב-ILS. */
export const PRICE_ILS = 29.9;
export const CURRENCY = 'ILS';

/** לתצוגה בממשק */
export const priceLabel = () => `${PRICE_ILS.toFixed(2)} ₪`;

/**
 * חלון ההצעה: כמה ימים לפני היציאה הבדיקה נחשבת "שווה משהו". מחוץ
 * לחלון הזה (רחוק מדי, כבר באמצע הטיול, או הטיול הסתיים) ההצעה פשוט
 * לא מוצגת - היא לא רלוונטית, לא "עדיין לא זמינה".
 *
 * 21 יום נבחר כי זה בערך הרגע שבו מזג האוויר, סגירות ואירועים מתחילים
 * להיות דבר שבאמת שווה לבדוק מחדש - שבועיים-שלושה לפני נסיעה אמיתית,
 * לא שלושה חודשים מראש כשהתוכנית עוד תזוז.
 */
export const OFFER_WINDOW_DAYS = 21;

export interface EligibilityResult {
  eligible: boolean;
  /** למה לא, לצורכי דיבוג/טסטים - לא מוצג למשתמש כמו שהוא */
  reason?: 'no-dates' | 'too-early' | 'in-progress-or-past';
}

/**
 * האם שווה להציע את הבדיקה לטיול הזה **כרגע**. נבדק תמיד מול תאריך
 * אמיתי שנמסר מבחוץ (`todayISO`) - לא `Date.now()` בפנים - כדי שהתצוגה
 * תהיה דטרמיניסטית בטסטים ולא תלויה בשעון ה-hydration.
 */
export function checkOfferEligibility(trip: Pick<Trip, 'startDate' | 'endDate'>, todayISO: string): EligibilityResult {
  if (!trip.startDate) return { eligible: false, reason: 'no-dates' };
  const cd = countdown(todayISO, trip.startDate, trip.endDate);
  if (!cd) return { eligible: false, reason: 'no-dates' };
  if (cd.kind === 'future') {
    return cd.days <= OFFER_WINDOW_DAYS ? { eligible: true } : { eligible: false, reason: 'too-early' };
  }
  if (cd.kind === 'today') return { eligible: true };
  return { eligible: false, reason: 'in-progress-or-past' };
}

/* ============ צורת הדו"ח ============ */

export interface ReportPlaceFlag {
  dayNumber: number;
  placeId: string;
  reason: 'not-in-catalog';
}

export interface ReportKosherNote {
  dayNumber: number;
  placeId: string;
  name: string;
  status: 'kosher' | 'not-kosher' | 'unknown';
  supervision?: string;
  lastChecked?: string;
  note: string;
}

export interface ReportCalendarFinding {
  name: string;
  impact: string;
  note: string;
  dates: string;
  dayNumbers: number[];
  sourceUrl: string;
}

export interface ReportItineraryStop {
  name: string;
  category: string;
  mustSee?: boolean;
  unknown?: boolean;
}

export interface ReportItineraryDay {
  dayNumber: number;
  cityName: string;
  date?: string;
  stops: ReportItineraryStop[];
}

export interface PreDepartureReport {
  generatedAt: string;
  tripName: string;
  startDate?: string;
  endDate?: string;
  placesChecked: number;
  placesFlagged: ReportPlaceFlag[];
  kosherChecked: number;
  kosherNotes: ReportKosherNote[];
  calendarFindings: ReportCalendarFinding[];
  routeOk: boolean;
  routeNote?: string;
  itinerary: ReportItineraryDay[];
}
