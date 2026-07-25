/**
 * תוכניות ומכסות - הקובץ המשותף היחיד בין השרת (אכיפה) ל-UI (עמוד
 * הפרימיום, הודעות המכסה). אין כאן סודות.
 *
 * "יחידות AI" הן מדד העלות הפנימי של שיחת סוכן: טוקן קלט לא-מקאש = 1,
 * טוקן פלט = 4 (משקף בקירוב את יחס המחירים; קריאות מהמטמון כמעט חינם
 * ולכן לא נספרות). משתמש חופשי מקבל מספיק לבניית טיול מלא + עשרות
 * עריכות ביום - המכסה נועדה לעצור שימוש לרעה, לא שימוש אמיתי.
 */

export type Plan = 'free' | 'premium';

export interface PlanLimits {
  /** בקשות צ׳אט ביום (גם במצב ללא מפתח - מגן על השרת עצמו) */
  chatPerDay: number;
  /** בקשות צ׳אט בדקה (הגנת פרץ) */
  chatBurstPerMin: number;
  /** תקציב יחידות AI יומי (קלט לא-מקאש + פלט*4) */
  aiUnitsPerDay: number;
  /** בניות מסלול מהירות (/api/generate-trip) ביום */
  generatePerDay: number;
  /** קודי שיתוף קצרים ביום */
  sharesPerDay: number;
  /** ייבוא מפות (Google My Maps) ביום */
  importsPerDay: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    chatPerDay: 40,
    chatBurstPerMin: 6,
    aiUnitsPerDay: 300_000,
    generatePerDay: 15,
    sharesPerDay: 10,
    importsPerDay: 5,
  },
  premium: {
    chatPerDay: 400,
    chatBurstPerMin: 15,
    aiUnitsPerDay: 3_000_000,
    generatePerDay: 100,
    sharesPerDay: 100,
    importsPerDay: 50,
  },
};

/** חישוב יחידות AI מ-usage של Anthropic (קריאות מהמטמון לא נספרות) */
export function aiUnits(usage: {
  input_tokens?: number;
  cache_creation_input_tokens?: number;
  output_tokens?: number;
}): number {
  return (
    (usage.input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.output_tokens ?? 0) * 4
  );
}

/**
 * המחיר המוצג בעמוד הפרימיום. החיוב בפועל נקבע ע"י ה-Price שמוגדר
 * ב-Stripe (STRIPE_PRICE_ID) - חובה לוודא שהשניים תואמים לפני השקה.
 */
export const PREMIUM_PRICE_ILS = 19.9;

/** שורות ההשוואה בעמוד הפרימיום - נגזרות מהמכסות האמיתיות, לא מועתקות */
export const PLAN_FEATURE_ROWS: { label: string; free: string; premium: string }[] = [
  {
    label: 'שיחות עם הסוכן ביום',
    free: String(PLAN_LIMITS.free.chatPerDay),
    premium: String(PLAN_LIMITS.premium.chatPerDay),
  },
  {
    label: 'תקציב AI יומי (בניות ועריכות מסלול)',
    free: 'בסיסי - טיול מלא + עשרות עריכות',
    premium: 'פי 10 - ללא דאגות',
  },
  {
    label: 'בניות מסלול מהירות (שאלון/מתכנן)',
    free: String(PLAN_LIMITS.free.generatePerDay),
    premium: String(PLAN_LIMITS.premium.generatePerDay),
  },
  {
    label: 'ייבוא מפות מ-Google My Maps ביום',
    free: String(PLAN_LIMITS.free.importsPerDay),
    premium: String(PLAN_LIMITS.premium.importsPerDay),
  },
  {
    label: 'קישורי שיתוף קצרים ביום',
    free: String(PLAN_LIMITS.free.sharesPerDay),
    premium: String(PLAN_LIMITS.premium.sharesPerDay),
  },
];
