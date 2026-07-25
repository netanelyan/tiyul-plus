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
   * מה כבר סגור בטיול ומה עוד חסר (טיסות, לינה, כרטיסים...).
   * נשמר רק ממה שהמשתמש אמר בפועל - הסוכן לא מנחש. הקישורים עצמם
   * מגיעים מ-`src/lib/booking.ts`, אף פעם לא מהמודל.
   */
  booking?: Partial<Record<BookingKind, BookingStatus>>;
}

/** סוגי ההזמנות שהאתר יודע לדבר עליהם (הקונפיג עצמו ב-`src/lib/booking.ts`) */
export type BookingKind = 'flights' | 'stay' | 'activities' | 'esim' | 'insurance' | 'car';

/** 'have' = כבר סגור · 'need' = עוד צריך · 'not_needed' = לא רלוונטי לטיול הזה */
export type BookingStatus = 'have' | 'need' | 'not_needed';

export interface Trip {
  id: string;
  name: string;
  citySlugs: string[]; // סדר הערים בטיול
  days: TripDay[];
  createdAt: number;
  preferences?: TripPreferences;
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
