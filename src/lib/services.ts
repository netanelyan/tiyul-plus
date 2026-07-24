// ---------- גישה מהירה: שירותי נסיעה ----------
// כרטיסי השירותים בדף הבית (טיסות / לינה / אטרקציות / רכב).
//
// חשוב - כנות מסחרית: נכון להיום אין שום שילוב אפיליאייט אמיתי בקוד.
// כל עוד `affiliateUrl` הוא null, הכפתור מפנה ל-`publicUrl` (אתר הספק
// הרשמי, בלי פרמטרי מעקב שהומצאו). כשיהיה קישור/מזהה שותפים אמיתי,
// מדביקים אותו ב-`affiliateUrl` של הכרטיס הרלוונטי - בלי לגעת בקומפוננטה.
// אם גם `publicUrl` וגם `affiliateUrl` הם null, הכרטיס מציג מצב "בקרוב".

export interface QuickService {
  key: 'flights' | 'stay' | 'tickets' | 'car';
  emoji: string;
  title: string; // עברית
  description: string; // עברית, משפט קצר
  cta: string; // תווית הכפתור
  provider: string | null; // שם הספק להצגה (למשל "Skyscanner"); null = אין ספק נבחר
  affiliateUrl: string | null; // קישור שותפים אמיתי - כרגע אין לאף אחד
  publicUrl: string | null; // אתר הספק הציבורי (placeholder לא-אפיליאייט); null => "בקרוב"
}

export const quickServices: QuickService[] = [
  {
    key: 'flights',
    emoji: '✈️',
    title: 'טיסות',
    description: 'השוואת מחירים לטיסות מנתב"ג ליעד שבחרתם.',
    cta: 'חיפוש טיסות',
    provider: 'Skyscanner',
    affiliateUrl: null,
    publicUrl: 'https://www.skyscanner.co.il/',
  },
  {
    key: 'stay',
    emoji: '🏨',
    title: 'לינה ואירוח',
    description: 'מלונות, דירות וצימרים - לפי תקציב ומיקום.',
    cta: 'חיפוש לינה',
    provider: 'Booking.com',
    affiliateUrl: null,
    publicUrl: 'https://www.booking.com/',
  },
  {
    key: 'tickets',
    emoji: '🎟️',
    title: 'כרטיסים לאטרקציות ופעילויות',
    description: 'דילוגי תור, סיורים וחוויות - שמורים מראש.',
    cta: 'חיפוש חוויות',
    provider: 'GetYourGuide',
    affiliateUrl: null,
    publicUrl: 'https://www.getyourguide.com/',
  },
  {
    key: 'car',
    emoji: '🚗',
    title: 'השכרת רכב',
    description: 'רכב לימי הטיול - חופש לצאת מחוץ לעיר.',
    cta: 'בקרוב',
    provider: null,
    affiliateUrl: null,
    publicUrl: null, // ספק עדיין לא נבחר - מצב "בקרוב" מכוון
  },
];
