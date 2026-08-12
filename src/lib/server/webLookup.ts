import { LOOKUP_ANCHOR } from '@/lib/priceGuard';
import type { ChatMessage } from '@/lib/server/chatMessages';

/**
 * שרת בלבד - חיפוש חי לשאלות עובדתיות ותלויות-זמן שהקטלוג שלנו לא
 * יכול לענות עליהן: שעות פתיחה, מחיר כניסה, האם מקום עדיין קיים/פתוח.
 *
 * ## למה זה קובץ נפרד ולא עוד `if` ב-route.ts
 *
 * שלוש החלטות גרות כאן ולא בלולאת הסוכן: **מתי מותר בכלל** (מסווג
 * דטרמיניסטי, לא המודל), **כמה פעמים בשיחה** (נגזר מהיסטוריית ההודעות,
 * בלי state בשרת - אותו דפוס כמו `relevantCitySlugs`), ו**מה שכבר נשאל**
 * (מטמון פשוט לפי טקסט זהה). שלושתם צריכים טסט משלהם.
 *
 * ## למה כשרות לא עוברת דרך כאן בשום צורה
 *
 * `wantsLookup` ב-route.ts קורא ל-`kosherIntentText` **לפני** שהוא שואל
 * את השאלה הזאת בכלל, ומחזיר `false` על כל הודעה שנשמעת כמו שאלת כשרות -
 * בלי קשר לשאלה אם היא גם עובדתית ("האם המסעדה הכשרה הזאת עדיין פתוחה?"
 * היא גם וגם, וכשרות מנצחת). זו לא הנחיה שאפשר לשכוח: כשהתנאי הזה false,
 * `LOOKUP_TOOL` פשוט לא נכנס למערך הכלים באותה קריאת API - כלי שלא נשלח
 * לא קיים בשביל המודל, אותו עיקרון בדיוק כמו `modelRoute.ts`. השכבה
 * השנייה, הבלתי-תלויה לגמרי בזאת, היא `priceGuard.ts`'s `kosher-claim`:
 * גם אם המודל יכתוב טענת כשרות מהזיכרון שלו (בלי שום קשר לחיפוש), היא
 * לא יוצאת אלא אם היא נוקבת בשם אמיתי מהקטלוג. שתי השכבות לא תלויות
 * זו בזו בכוונה - אחת חוסמת את הפעולה, השנייה חוסמת את הפלט.
 */

/** כלי החיפוש עצמו - שרת של Anthropic מריץ אותו, לא אנחנו. */
export const LOOKUP_TOOL = {
  type: 'web_search_20260209' as const,
  name: 'web_search' as const,
  /** תקרה בתוך קריאת API בודדת - שאלה עובדתית לא צריכה יותר משני חיפושים */
  max_uses: 2,
};

/**
 * מסווג דטרמיניסטי: שעות/מחיר-כניסה/האם-עדיין-קיים. **לא** שאלות
 * כלליות ("מה כדאי לראות") ו**לא** שיחה רגילה - רק השאלה הצרה שהקטלוג
 * שלנו באמת לא יכול לענות עליה.
 */
/*
  `(ה)?` צמוד לכל שם עצם - "שעות הפתיחה"/"דמי הכניסה" הם הכתיב התקני
  בעברית, לא "שעות פתיחה" בלי ה"א הידיעה. אותה מלכודת בדיוק תפסה
  TICKET_CONTEXT ב-priceGuard.ts, ושתיהן נתפסו רק כי הטסטים כתובים
  בעברית תקנית ולא בעברית "רשמית של regex".
*/
const LOOKUP_INTENT =
  /שעות\s*ה?(פתיחה|פעילות)|פתוח(ה)?\s*(עכשיו|היום|בשעה)|סגור(ה)?\s*(עכשיו|היום)|עדיין\s*(פתוח|קיים|פועל|קיימת|פועלת)|כבר לא (קיים|פועל)|האם.{0,20}(נסגר|עדיין קיים|עדיין פועל|עדיין פתוח)|כמה עולה\s*ה?(כניסה|כרטיס)|מחיר\s*ה?כניסה|דמי\s*ה?כניסה|עלות\s*ה?כניסה|כרטיס\s*ה?כניסה|opening hours|admission (fee|price)|entrance fee|ticket price|is (it |the .+ )?still (open|there)|does (it|.+) still exist|has .+ closed/i;

export function lookupEligible(text: string): boolean {
  return LOOKUP_INTENT.test(text ?? '');
}

/** תקרה לכל שיחה - נספרת מההיסטוריה עצמה, בלי state בשרת */
const MAX_LOOKUPS_PER_CONVERSATION = 3;

/**
 * כמה חיפושים כבר "נחתמו" בשיחה - נספר לפי `LOOKUP_ANCHOR` בתשובות
 * הסוכן עצמן. זה אותו עיקרון כמו ספירת ה-tokens בהיסטוריה: במקום
 * לשמור מונה בשרת (שלא שורד restart ולא מסתנכרן בין instances), קוראים
 * את מה שכבר נשלח למשתמש. תשובה שהמודל כתב עם ציטוט אחד או יותר סופרת
 * כניצול חיפוש אחד - גם אם בפועל הוא חיפש פעמיים באותה קריאת API,
 * כי `max_uses` על הכלי כבר עוצר את זה.
 */
export function lookupsUsedSoFar(messages: ChatMessage[]): number {
  let n = 0;
  for (const m of messages) {
    if (m.role !== 'assistant') continue;
    if (LOOKUP_ANCHOR.test(m.content)) n += 1;
  }
  return n;
}

export function lookupBudgetLeft(messages: ChatMessage[]): boolean {
  return lookupsUsedSoFar(messages) < MAX_LOOKUPS_PER_CONVERSATION;
}

/**
 * תאריך היום, כעובדה שמסופקת לו ולא מחושבת על ידו - אותו עיקרון בדיוק
 * כמו תאריכי הטיול ("Never compute a date yourself"). ננעל פעם אחת
 * לקריאה כדי שכל ה-retries/איטרציות של אותו תור יראו את אותו תאריך.
 */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * ---------- מטמון פשוט: אותה שאלה פעמיים = חיפוש אחד ----------
 *
 * לא cache לפני-הקריאה של תוצאת חיפוש גולמית - `web_search` הוא כלי
 * שרת שרץ אוטומטית בתוך קריאת ה-API עצמה, ואין נקודה שבה אפשר ליירט
 * "המודל עומד לחפש X" ולהחזיר לו תשובה מוכנה בלי לקרוא ל-API בכלל.
 * מה שכן אפשר, וזה כל מה שהמטמון הזה עושה: לזהות ששאלה **זהה** כבר
 * נענתה, ולדלג על שליחת `LOOKUP_TOOL` בכלל בתור הזה - המודל מקבל את
 * התשובה הקודמת כעובדה מוכנה בבלוק הפירוט, בלי חיפוש נוסף.
 *
 * זהו זיכרון תהליך בלבד (per-instance), באותו סגנון בדיוק כמו
 * `checkLimit` ב-limits.ts - לא שורד restart ולא מסתנכרן בין instances,
 * וזה בסדר: הוא אופטימיזציה למחיר, לא מנגנון בטיחות.
 */
interface CachedLookup {
  reply: string;
  at: number;
}

const CACHE_TTL_MS = 12 * 60 * 60_000;
/** הגנת זיכרון גסה, אותו דפוס כמו `budget.ts`'s callers.size */
const CACHE_MAX_ENTRIES = 500;
const cache = new Map<string, CachedLookup>();

function normalizeLookupKey(text: string): string {
  return (text ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getCachedLookup(userText: string): string | null {
  const key = normalizeLookupKey(userText);
  if (!key) return null;
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.reply;
}

export function rememberLookup(userText: string, reply: string): void {
  const key = normalizeLookupKey(userText);
  if (!key || !reply) return;
  if (cache.size > CACHE_MAX_ENTRIES) cache.clear();
  cache.set(key, { reply, at: Date.now() });
}

/** לבדיקות בלבד */
export function resetLookupCacheForTest(): void {
  cache.clear();
}
