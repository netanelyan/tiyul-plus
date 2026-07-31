/**
 * שרת בלבד - מה קריאת מודל **באמת עלתה**, בדולרים.
 *
 * עד היום נספרו "יחידות AI" (`aiUnits`): מדד פנימי טוב למכסה אישית,
 * אבל אי אפשר להסתכל עליו ולדעת אם החשבון החודשי יהיה 5 דולר או 500.
 * נתנאל ביקש תקרה על **כסף**, ולכסף צריך מחיר.
 *
 * המחירים נכונים ל-31 ביולי 2026 לפי דף התמחור של Anthropic. הם לא
 * "מגבלה" ולכן הם בקוד ולא בדגל - מגבלה משתנה כשמחליטים, מחיר משתנה
 * כשהספק מחליט, ושינוי מחיר ראוי לקומיט שאפשר לראות.
 *
 * **דגם לא מוכר לא מוערך.** הוא נופל למחיר השמרני ביותר בטבלה, כי
 * הכיוון הבטוח לטעות בתקרת הוצאה הוא כלפי מעלה: להעריך יקר פירושו
 * לעצור מוקדם מדי, להעריך זול פירושו לגלות בחשבון.
 */

export interface ModelPrice {
  /** דולר למיליון טוקנים */
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
}

/** דולר למיליון טוקנים, לפי platform.claude.com/docs/en/about-claude/pricing */
export const MODEL_PRICES: Record<string, ModelPrice> = {
  'claude-sonnet-4-5': { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  'claude-haiku-4-5': { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
};

/** התעריף היקר ביותר שמוכר לנו - ברירת המחדל לדגם לא מזוהה */
const FALLBACK: ModelPrice = Object.values(MODEL_PRICES).reduce((a, b) =>
  a.output >= b.output ? a : b,
);

export function priceFor(model: string): ModelPrice {
  // התאמה לפי תחילית: "claude-sonnet-4-5-20260101" הוא אותו מחיר
  for (const [name, price] of Object.entries(MODEL_PRICES)) {
    if (model === name || model.startsWith(`${name}-`)) return price;
  }
  return FALLBACK;
}

export interface TokenUsage {
  input_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  output_tokens?: number;
}

/**
 * העלות בדולרים של קריאה אחת.
 *
 * `input_tokens` של Anthropic הוא הקלט **שלא** הגיע מהמטמון - קריאות
 * וכתיבות מטמון מדווחות בשדות נפרדים, ולכן אין כאן ספירה כפולה.
 */
export function costUsd(model: string, u: TokenUsage): number {
  const p = priceFor(model);
  return (
    ((u.input_tokens ?? 0) * p.input +
      (u.cache_creation_input_tokens ?? 0) * p.cacheWrite +
      (u.cache_read_input_tokens ?? 0) * p.cacheRead +
      (u.output_tokens ?? 0) * p.output) /
    1_000_000
  );
}

/** תצוגה קצרה בדולרים - ארבע ספרות אחרי הנקודה כי תור בודד עולה אגורות */
export const usd = (n: number): string => `$${n.toFixed(n < 1 ? 4 : 2)}`;
