// ---------- גישה מהירה: שירותי נסיעה ----------
// כרטיסי השירותים בדף הבית (טיסות / לינה / אטרקציות / רכב).
//
// אין כאן קונפיג משלו: הכרטיסים נגזרים מ-`src/lib/booking.ts`, שהוא
// המקור היחיד לספקים ולקישורים באתר. כך שינוי מזהה שותפים אחד משנה
// גם את דף הבית וגם את פאנל ההזמנות שבתוך הטיול.
//
// כנות מסחרית: כל עוד אין מזהה שותפים אמיתי, הכפתור מפנה לאתר הציבורי
// של הספק - בלי פרמטרי מעקב שהומצאו. ספק שעדיין לא נבחר מוצג כ"בקרוב".

import { bookingProvider, buildBookingUrl, bookingIsAffiliate } from './booking';
import type { BookingKind } from './trip/types';

export interface QuickService {
  key: BookingKind;
  emoji: string;
  title: string; // עברית
  description: string; // עברית, משפט קצר
  cta: string; // תווית הכפתור
  provider: string | null; // שם הספק להצגה; null = אין ספק נבחר
  affiliateUrl: string | null; // קישור שותפים אמיתי - null עד שיוגדר מזהה
  publicUrl: string | null; // אתר הספק הציבורי; null => "בקרוב"
}

// בדף הבית מוצגים ארבעת השירותים הקלאסיים; ביטוח/eSIM נשארים בתוך
// פאנל ההזמנות של הטיול, שם הם רלוונטיים ליעד מסוים.
const HOME_KINDS: BookingKind[] = ['flights', 'stay', 'activities', 'car'];

export const quickServices: QuickService[] = HOME_KINDS.flatMap((kind) => {
  const p = bookingProvider(kind);
  if (!p) return [];
  const url = buildBookingUrl(kind); // בלי יעד - דף הבית של הספק
  const isAffiliate = bookingIsAffiliate(kind);
  return [
    {
      key: kind,
      emoji: p.emoji,
      title: p.title,
      description: p.blurb,
      cta: p.cta,
      provider: p.provider,
      affiliateUrl: isAffiliate ? url : null,
      publicUrl: isAffiliate ? null : url,
    },
  ];
});
