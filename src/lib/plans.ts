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

/**
 * תפקידים. 'user' הוא ברירת המחדל ואין לו שום הרשאה מיוחדת.
 *
 * ההיררכיה היא סידורית בכוונה (`ROLE_RANK`), כך שבדיקת הרשאה היא השוואה
 * אחת ולא רשימת if-ים שמישהו ישכח לעדכן כשיתווסף תפקיד.
 */
export type Role = 'user' | 'admin' | 'owner';

export const ROLE_RANK: Record<Role, number> = { user: 0, admin: 1, owner: 2 };

export const isRole = (v: unknown): v is Role =>
  v === 'user' || v === 'admin' || v === 'owner';

/** האם ל-role יש לפחות את ההרשאות של need */
export const roleAtLeast = (role: Role, need: Role) => ROLE_RANK[role] >= ROLE_RANK[need];

/**
 * התוכנית **בפועל**, אחרי פקיעה.
 *
 * למה זו פונקציה ולא קריאה של העמודה: פרימיום יכול להגיע משני מקורות -
 * מנוי Stripe (בלי תאריך סיום; ה-webhook מוריד אותו כשהוא מתבטל) או
 * מהענקה של אדמין, שיכולה להיות מוגבלת בזמן. בלי הבדיקה הזאת הענקה
 * ל-30 יום הופכת בשקט לפרימיום לנצח - וזה בדיוק סוג הבאג שלא מתגלה,
 * כי הוא נראה כמו נדיבות.
 *
 * **נקודת אמת אחת**: כל מי שמחליט אם מישהו פרימיום חייב לעבור כאן -
 * גם השרת (identity.ts, אכיפת מכסות) וגם ה-UI.
 */
export function effectivePlan(
  row: { plan?: string | null; plan_until?: string | null } | null | undefined,
  now: number = Date.now(),
): Plan {
  if (!row || row.plan !== 'premium') return 'free';
  if (!row.plan_until) return 'premium';
  const until = Date.parse(row.plan_until);
  if (Number.isNaN(until)) return 'premium'; // תאריך פגום לא שולל מנוי שכבר שולם
  return until > now ? 'premium' : 'free';
}

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
  /**
   * תמונות שאפשר לצרף לשיחה ביום (צילום אישור הזמנה, כרטיס טיסה).
   * תמונה עולה למודל הרבה יותר מטקסט, ולכן המכסה נמוכה בכוונה.
   */
  imagesPerDay: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    chatPerDay: 40,
    chatBurstPerMin: 6,
    aiUnitsPerDay: 300_000,
    generatePerDay: 15,
    sharesPerDay: 10,
    importsPerDay: 5,
    imagesPerDay: 3,
  },
  premium: {
    chatPerDay: 400,
    chatBurstPerMin: 15,
    aiUnitsPerDay: 3_000_000,
    generatePerDay: 100,
    sharesPerDay: 100,
    importsPerDay: 50,
    imagesPerDay: 30,
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
    label: 'צירוף תמונות לשיחה ביום (אישור הזמנה, כרטיס)',
    free: String(PLAN_LIMITS.free.imagesPerDay),
    premium: String(PLAN_LIMITS.premium.imagesPerDay),
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
