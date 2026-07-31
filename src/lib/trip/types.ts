// ---------- מודל הטיול ----------
// "טיול" הוא האובייקט המרכזי של האתר: רשימת ערים לפי סדר,
// וימים שכל אחד שייך לעיר ומחזיק עצירות מסודרות.

export interface TripDay {
  id: string;
  citySlug: string; // לאיזו עיר שייך היום
  placeIds: string[]; // עצירות לפי סדר
  notes?: string;
}

// העדפות המטייל - נאספות בשיחה עם הסוכן, נשמרות על הטיול,
// ומכבדות אותן גם ההמלצות של הסוכן וגם האשף. אף העדפה לא מונחת מראש.
export interface TripPreferences {
  party?: 'couple' | 'family' | 'friends' | 'solo';
  pace?: 'relaxed' | 'packed';
  budget?: 'low' | 'medium' | 'high';
  kosher?: boolean;
  shabbatAware?: boolean;
  shopping?: 'more' | 'normal' | 'less';
  interests?: string[];
  /**
   * סגנון הנסיעה לצורך **הצגת הוצאה יומית טיפוסית** בלבד.
   *
   * זה בכוונה לא `budget` שמעליו: `budget` נאסף בשיחה ומשפיע על דירוג
   * המקומות (עונשי `priceLevel` ב-`generate.ts`), והוא נכתב גם ע"י
   * הסוכן. השדה הזה נכתב **רק מהממשק**, אין לו כלי סוכן, ולכן המודל
   * לא יכול להזיז את המספרים שהמשתמש רואה - גם לא בעקיפין. ערך חסר
   * פירושו "עוד לא נבחר", ואז לא מוצג שום מספר.
   */
  travelStyle?: 'budget' | 'mid' | 'comfort';
  /**
   * מה כבר סגור בטיול ומה עוד חסר (טיסות, לינה, כרטיסים...).
   * נשמר רק ממה שהמשתמש אמר בפועל - הסוכן לא מנחש. הקישורים עצמם
   * מגיעים מ-`src/lib/booking.ts`, אף פעם לא מהמודל.
   */
  /**
   * מצב ההזמנות **לטיול כולו** - טיסות, eSIM, ביטוח, רכב.
   *
   * נושא גם את הערכים ההיסטוריים של לינה וכרטיסים, מהתקופה שבה הם היו
   * לטיול כולו. הם נקראים כברירת מחדל לכל עיר עד לעריכה הראשונה, ואז
   * נפרסים ל-`bookingByCity` ונמחקים מכאן. ראו `bookingStatus.ts`.
   */
  booking?: Partial<Record<BookingKind, BookingStatus>>;
  /**
   * מצב ההזמנות **לפי עיר**, לסוגים שנקנים בעיר מסוימת (לינה, כרטיסים).
   * "יש לנו מלון" בטיול של ברטיסלבה ווינה הוא משפט חסר משמעות - הוא
   * נכון לאחת מהן ולא לשנייה, וזה בדיוק מה שהמצב הישן לא ידע לבטא.
   */
  bookingByCity?: Partial<Record<BookingKind, Record<string, BookingStatus>>>;
}

/** סוגי ההזמנות שהאתר יודע לדבר עליהם (הקונפיג עצמו ב-`src/lib/booking.ts`) */
export type BookingKind = 'flights' | 'stay' | 'activities' | 'esim' | 'insurance' | 'car';

/** 'have' = כבר סגור · 'need' = עוד צריך · 'not_needed' = לא רלוונטי לטיול הזה */
export type BookingStatus = 'have' | 'need' | 'not_needed';

/**
 * סוג הסיכה. שלושת אלה נבחרו במפורש: לינה, הזמנה (מסעדה/פעילות),
 * וסיכה חופשית. אין סוג לשדות תעופה/תחנות - זו החלטת מוצר, לא השמטה.
 */
export type TripPinKind = 'stay' | 'reservation' | 'other';

/**
 * מקור הקואורדינטות. 'geocoded' = נמצא בשרת מול OpenStreetMap,
 * 'manual' = המטייל גרר את הסיכה על המפה בעצמו. אין ערך שלישי:
 * **המודל לעולם לא מספק קואורדינטות**. אם החיפוש נכשל או היה
 * דו-משמעי, הסיכה נשמרת בלי lat/lng ומסומנת "מיקום לא אומת" -
 * לא מנחשים את מרכז העיר.
 */
export type TripPinSource = 'geocoded' | 'manual';

/**
 * סיכה שהמטייל הוסיף לטיול: המלון שהוא הזמין, מסעדה ששמר בה שולחן,
 * או כל נקודה שהוא רוצה לראות על המפה. נוצרת בעיקר דרך השיחה עם
 * הסוכן ("הזמנתי את Hotel Devin בברטיסלבה"), ומצוירת על אותה מפה
 * של הטיול לצד עצירות הקטלוג.
 */
export interface TripPin {
  id: string;
  kind: TripPinKind;
  /** מה שהמטייל אמר - שם המלון/המסעדה/המקום */
  name: string;
  /** לאיזו עיר בטיול הסיכה שייכת (slug מ-citySlugs), אם ידוע */
  citySlug?: string;
  /** הכתובת כפי שהוחזרה מהחיפוש, לתצוגה בלבד */
  address?: string;
  lat?: number;
  lng?: number;
  source?: TripPinSource;
  /** הערה חופשית של המטייל (מספר אישור, שעת צ׳ק-אין) */
  note?: string;
  createdAt?: number;
}

export interface Trip {
  id: string;
  name: string;
  citySlugs: string[]; // סדר הערים בטיול
  days: TripDay[];
  createdAt: number;
  /**
   * תאריכי הטיול, `YYYY-MM-DD` (תאריך, לא רגע בזמן - ראו `dates.ts`).
   * שניהם אופציונליים: טיול בלי תאריכים הוא מצב לגיטימי ונפוץ, ולכן
   * שום דבר בממשק לא דורש אותם. תאריך של יום N **נגזר** מ-`startDate`
   * ולא נשמר לכל יום, כך שהוא לא יכול לצאת מסנכרון עם סדר הימים.
   * `endDate` נשמר בנפרד כי המשתמש חושב בטווח - והפער בינו לבין מספר
   * הימים מוצג לו במפורש במקום שהתאריך ישנה לו את התוכנית בשקט.
   */
  startDate?: string;
  endDate?: string;
  /** חותמת שינוי אחרון - נכתבת ע"י שכבת הסנכרון לחשבון (מיזוג לפי המאוחר) */
  updatedAt?: number;
  preferences?: TripPreferences;
  /** סיכות שהמטייל הוסיף (לינה, הזמנות, נקודות חופשיות) */
  pins?: TripPin[];
}

/** האם כבר יש לינה שמורה לעיר הזו - כדי שהסוכן לא ישאל פעמיים */
export function hasStayPin(trip: Trip | null, citySlug: string): boolean {
  return Boolean(
    trip?.pins?.some((p) => p.kind === 'stay' && p.citySlug === citySlug),
  );
}

// העדפות האשף החכם
export interface WizardPrefs {
  citySlugs: string[];
  totalDays: number;
  pace: 'relaxed' | 'packed';
  tripType: 'city' | 'nature' | 'combined';
  shopping: 'more' | 'normal' | 'less';
  kosherOnly: boolean;
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}
