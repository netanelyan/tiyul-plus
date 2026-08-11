import { dayKey } from '@/lib/server/limits';
import { eq, neq, pgQuery, pgSelect } from '@/lib/server/pgrest';
import { allFlags } from '@/lib/server/flags';
import { costUsd, type TokenUsage } from '@/lib/server/aiCost';
import { serviceHeaders } from '@/lib/server/supabaseAdmin';

/**
 * שרת בלבד - **תקרת ההוצאה על ה-AI**, בשני ארנקים ועם תקרה אישית.
 *
 * ## מה השתנה, ולמה זה מבני
 *
 * הגרסה הראשונה הייתה ארנק אחד. נתנאל הצביע על הפגם: מבקר אנונימי
 * אחד יכול לשרוף חלק גדול מהתקרה, וכמה כאלה מכבים את הסוכן **לכולם**
 * עד חצות. זה הופך בעיית עלות לנפילה, וזה גרוע יותר.
 *
 * שתי הגנות, שתיהן:
 *
 * 1. **שני ארנקים.** לתנועה אנונימית יש תקציב משלה. מחוברים מושכים
 *    מ"כל מה שאנונימיים לא הוציאו", ולכן **תמיד** נשאר להם לפחות
 *    `1 - ANON_SHARE` מהיום, ואין דרך שבה אנונימי יכבה אותם.
 * 2. **תקרה אישית.** אף זהות - מחוברת או לא - לא יכולה לעבור חלק קטן
 *    מהיום. גם עשרה מנצלים לא מכבים את המוצר, הם רק מכבים את עצמם.
 *
 * ## למה מחוברים לא מקבלים ארנק קשיח משלהם
 *
 * שני ארנקים קשיחים היו יוצרים את הבעיה ההפוכה: ביום שקט מבחינת
 * אנונימיים, מחוברים היו נחסמים ב-70% בזמן ש-30% מהתקציב יושבים
 * ללא שימוש. הנוסחה כאן נותנת למחוברים את כל מה שלא נוצל, ועדיין
 * מבטיחה להם רצפה.
 *
 * ## איך נמדדת ההוצאה - וזו שאלה שנתנאל שאל במפורש
 *
 * **מדיווח אמיתי, לא מהערכה.** המספרים מגיעים מ-`usage` של Anthropic
 * עצמה: `message_start` נושא את הקלט ואת המטמון, `message_delta` את
 * הפלט הסופי. אנחנו לא סופרים טוקנים בעצמנו.
 *
 * שלושה מסלולים שבהם המספר **יכול לסטות כלפי מטה**, וכל אחד מטופל:
 *
 * 1. **קריאה שנקטעה באמצע** - `message_delta` לא הגיע, ולכן אין
 *    `output_tokens`. הטוקנים כבר חויבו. `costUsd` מקבל הערכה שמרנית
 *    מאורך הטקסט שכן הוזרם, במקום אפס.
 * 2. **כתיבה לדאטהבייס שנכשלת** - הספירה המקומית עדיין נכונה
 *    ל-instance הזה, והסנכרון הבא מושך את המקסימום.
 * 3. **הדאטהבייס לא נגיש בכלל** - וזה החור האמיתי: בלי סכום משותף
 *    כל instance סופר לעצמו, והתקרה בפועל מוכפלת במספר ה-instances.
 *    **כאן המערכת נכשלת סגור**: אם ההתמדה מוגדרת ולא הצלחנו לקרוא
 *    את הסכום היומי במשך `FAIL_CLOSED_MS`, הסוכן מפסיק לקבל בקשות.
 *    עדיף להיות למטה כמה דקות מאשר להוציא בלי לדעת כמה.
 */

/**
 * ברירת המחדל, בדולרים ליום, לכל המשתמשים יחד.
 *
 * ## **המספרים כאן נגזרו ממדידה, אחרי שהאומדן הקודם היה שגוי**
 *
 * הגרסה הראשונה הניחה ש"תור עולה $0.01-$0.13". שתי מדידות אמיתיות
 * (31.7): **קריאה ראשונה בסשן $0.447, קריאה אחריה $0.063.** ההפרש הוא
 * כתיבת המטמון של קידומת הקטלוג (~80 אלף טוקנים). כלומר:
 *
 * - **העלות שלנו היא לכל סשן קר, לא לכל הודעה.**
 * - ולכן העלות למבקר **יורדת ככל שהתנועה עולה** - כשהמטמון חם, הקריאה
 *   הראשונה של המבקר הבא היא גם היא קריאה מהמטמון.
 *
 * סשן תכנון אנונימי מלא (25 הודעות, התקרה של השכבה) עולה לפי המדידות
 * האלה כ-$2.1 טיפוסי, כ-$2.7 בגרוע. **התקרה האישית חייבת לשבת בנוחות
 * מעל המספר הזה**, אחרת בדיוק מה שקרה לנתנאל קורה לכל מבקר: חסימה
 * אחרי ארבע הודעות.
 *
 * ## **התקרה האישית נותקה מהתקרה היומית, וזה מה שהוריד את היום ל-$10**
 *
 * הגרסה הקודמת גזרה את התקרה האישית כאחוז מהיום (12%). זה כבל את שני
 * המספרים זה לזה בכיוון הלא נכון: כדי שאדם יקבל $3 - כלומר מספיק כדי
 * להשלים סשן תכנון של כ-$2.1 - **היום היה חייב להיות $25**, שהם $750
 * לחודש של חשיפה במקרה הקיצוני. נתנאל ניסח את זה מדויק: אנחנו לא רוצים
 * חשיפה של $750 בחודש כדי להגן על סשן של $2.
 *
 * עכשיו התקרה האישית היא **מספר מוחלט** (`CALLER_CAP_USD`), והיום הוא
 * מספר נפרד. אפשר להוריד את היום בלי לקצץ באף אחד באמצע התכנון.
 *
 * $10 ליום הם **$300 לחודש** במקרה הקיצוני, ובפועל דולרים בודדים.
 * ושדה טקסט אחד ב-/admin משנה את זה בלי דיפלוי, כשהתנועה תצדיק את זה.
 */
export const DEFAULT_DAILY_BUDGET_USD = 10;

/**
 * חלקה של התנועה האנונימית מהתקציב היומי.
 *
 * **הועלה ל-55% יחד עם ירידת היום ל-$10, וזה לא כוונון אלא הכרח.**
 * ב-40% הארנק האנונימי היה $4, כלומר סשן מלא אחד ועוד קצת - והדרישה
 * המקורית הייתה שמבקר אנונימי יוכל להשלים סשן ולצאת משוכנע. ב-55%
 * הארנק הוא $5.50: שני סשנים קרים, ובמטמון חם שלושה עד ארבעה.
 *
 * הרצפה של המחוברים היא עדיין רצפה אמיתית - 45% מהיום - ובימים שקטים
 * מבחינת אנונימיים הם מקבלים את הכל. ההעדפה כאן מודעת: לפני ההשקה כמעט
 * כל המבקרים אנונימיים, והחסימה שלהם היא הנזק היקר.
 */
export const ANON_SHARE = 0.55;

/**
 * **התקרה שזהות אחת יכולה להוציא ביום, בדולרים. מספר מוחלט.**
 *
 * זה המספר שהיה קודם אחוז מהיום, וזו כל הנקודה: הוא נגזר מ**מה שעולה
 * סשן**, ולא ממה שאנחנו מוכנים להוציא בסך הכל. שני הדברים האלה לא
 * קשורים זה לזה, וכל עוד הם היו קשורים היה אי אפשר להוריד את היום בלי
 * לחתוך אנשים באמצע.
 *
 * מדוד: סשן תכנון מלא הוא כ-$2.1 טיפוסי וכ-$2.7 בגרוע ביותר, על מטמון
 * קר. $3.00 יושב בנוחות מעל שניהם.
 *
 * המשמעות המעשית של הניתוק: אם התקרה היומית תרד ל-$5, אף אחד עדיין לא
 * ייחסם באמצע סשן - פשוט ייכנסו פחות אנשים באותו יום. זו ההתנהגות
 * הנכונה, ובגרסה הקודמת היא הייתה הפוכה.
 */
export const CALLER_CAP_USD = 3.0;

/**
 * אנונימי ומחובר מקבלים **את אותה תקרה אישית**, וזו הוראה מפורשת
 * מהסשן שבו זה תוקן: קודם היה כאן אחוז מהארנק האנונימי, כלומר $0.225 -
 * פחות מקריאה קרה אחת שנמדדה ב-$0.447 - ומבקר אנונימי נחסם אחרי הודעה
 * או שתיים. זה בדיוק מה שקרה לנתנאל.
 *
 * המשמעות עכשיו: אנונימי אחד יכול לקחת עד $3 מתוך ארנק אנונימי של
 * $5.50. זו החלפה מודעת - "מבקר אחד שמשלים סשן" עדיף על "שלושה מבקרים
 * שכולם נחסמים באמצע", וכל מי שבאמת מנצל נתקל קודם במכסת ההודעות
 * היומית ובמגבלת הפרץ, הרבה לפני התקרה הכספית.
 */
export const ANON_CALLER_CAP_USD = CALLER_CAP_USD;

/**
 * פי כמה גבוהה תקרת ה-IP מתקרת אדם בודד.
 *
 * ה-IP אינו מכסה אלא **רשת ביטחון**: מפעילת סלולר ישראלית מעמידה
 * עשרות אלפי מכשירים מאחורי כתובת אחת, ולכן תקרה צמודה שם חוסמת
 * אנשים שמעולם לא נכנסו לאתר. פי 25 פירושו שכתובת משותפת תיתקל בה
 * רק אם עשרים וחמישה מבקרים שונים מיצו את המכסה האישית שלהם באותו
 * יום מאותה כתובת - ובפועל הארנק האנונימי ייגמר הרבה לפני זה, כך
 * שהרשת הזאת נוגעת רק במכונה אחת שמחליפה מזהים בלולאה.
 */
export const IP_BACKSTOP_MULTIPLE = 25;

/** מעל האחוז הזה של היום נשלחת התראה כללית, פעם אחת ביום */
export const ALERT_AT = 0.9;

/**
 * התראה **מיידית ונפרדת** על מקור בודד.
 *
 * נשלחת כשזהות אחת עברה 60% מהתקרה האישית שלה - כלומר **לפני**
 * שהיא נחסמת, שזה הרגע היחיד שבו אפשר לעשות משהו. זו ההתראה שנתנאל
 * ביקש להתעורר בשבילה; הכללית היא רק "היום עמוס".
 */
export const CALLER_ALERT_AT = 0.6;

/**
 * כמה זמן מותר להיות בלי סכום משותף לפני שנועלים.
 *
 * חמש דקות: מספיק כדי לספוג תקלה רגעית של הדאטהבייס בלי להפיל את
 * המוצר, וקצר מספיק שלא נוציא הרבה בעיוורון.
 */
const FAIL_CLOSED_MS = 5 * 60_000;

/** עלות שמיוחסת לקריאה שלא דיווחה שום מספר. שמרנית בכוונה. */
const UNMEASURED_CALL_USD = 0.05;

const supaUrl = () => process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
const persistent = () => Boolean(supaUrl() && serviceKey());

/*
  דרך `supabaseAdmin` ולא עותק מקומי: מפתח `sb_secret_` אינו JWT, ו-PostgREST
  דוחה `Bearer` שאינו JWT. העותק שהיה כאן שלח אותו תמיד, כלומר בפרויקט עם
  מפתח מהפורמט החדש כל כתיבה מכאן נדחתה - בשקט.
*/
const headers = () => serviceHeaders();

interface DayState {
  day: string;
  /** סך הכול היום */
  usd: number;
  /** מתוכו - תנועה אנונימית */
  anonUsd: number;
  syncedAt: number;
  /** מתי הצליח סנכרון בפעם האחרונה - הבסיס לכישלון-סגור */
  lastOk: number;
  /** הוצאה לפי זהות, היום */
  callers: Map<string, number>;
  /** זהויות שכבר נשלחה עליהן התראה */
  alertedCallers: Set<string>;
  alerted: boolean;
}

const fresh = (day: string): DayState => ({
  day,
  usd: 0,
  anonUsd: 0,
  syncedAt: 0,
  lastOk: Date.now(),
  callers: new Map(),
  alertedCallers: new Set(),
  alerted: false,
});

let state: DayState = fresh(dayKey());
const SYNC_MS = 20_000;

function today(): DayState {
  const day = dayKey();
  if (state.day !== day) state = fresh(day);
  return state;
}

/** האם הזהות היא אנונימית (לפי המפתח שנקבע ב-identity.ts) */
export const isAnonIdentity = (id: string): boolean => !id.startsWith('user:');

/* ---------- התקרה ---------- */

async function flagNumber(key: string): Promise<number | null> {
  const flags = await allFlags().catch(() => ({}) as Record<string, unknown>);
  const raw = flags[key];
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** התקרה היומית הכוללת */
export async function dailyBudgetUsd(): Promise<number> {
  const fromFlag = await flagNumber('ai_daily_budget_usd');
  if (fromFlag !== null) return fromFlag;
  const fromEnv = Number(process.env.AI_DAILY_BUDGET_USD);
  if (Number.isFinite(fromEnv) && fromEnv >= 0) return fromEnv;
  return DEFAULT_DAILY_BUDGET_USD;
}

/* ---------- קריאת המצב ---------- */

async function sync(s: DayState): Promise<void> {
  if (!persistent() || Date.now() - s.syncedAt <= SYNC_MS) return;
  s.syncedAt = Date.now();
  try {
    const res = await fetch(
      `${supaUrl()}/rest/v1/ai_spend_daily?${pgQuery(eq('day', s.day), pgSelect(['usd', 'anon_usd']))}`,
      { headers: headers(), signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) return;
    const rows = (await res.json()) as { usd?: number | string; anon_usd?: number | string }[];
    const total = Number(rows[0]?.usd ?? 0);
    const anon = Number(rows[0]?.anon_usd ?? 0);
    // max ולא השמה: כתיבות מהרגע האחרון עוד לא בהכרח שם
    if (Number.isFinite(total) && total > s.usd) s.usd = total;
    if (Number.isFinite(anon) && anon > s.anonUsd) s.anonUsd = anon;
    s.lastOk = Date.now();
  } catch {
    /* נשארים עם הספירה המקומית; אם זה נמשך - נכשלים סגור למטה */
  }
}

/** הוצאה של זהות אחת היום. ממזג מהאחסון בפעם הראשונה ביום. */
async function callerSpend(s: DayState, identity: string): Promise<number> {
  const local = s.callers.get(identity);
  if (local !== undefined || !persistent()) return local ?? 0;
  s.callers.set(identity, 0); // סימון "כבר ניסינו" - best effort, פעם אחת
  try {
    const res = await fetch(
      `${supaUrl()}/rest/v1/ai_spend_caller?${pgQuery(eq('day', s.day), eq('identity', identity), pgSelect(['usd']))}`,
      { headers: headers(), signal: AbortSignal.timeout(3000) },
    );
    if (res.ok) {
      const rows = (await res.json()) as { usd?: number | string }[];
      const remote = Number(rows[0]?.usd ?? 0);
      if (Number.isFinite(remote) && remote > 0) s.callers.set(identity, remote);
    }
  } catch {
    /* הזיכרון המקומי ממשיך להגן */
  }
  return s.callers.get(identity) ?? 0;
}

export type BlockReason = 'anon-pool' | 'caller' | 'total' | 'unmeasured' | null;

export interface BudgetState {
  /** התקרה היומית הכוללת */
  budget: number;
  spent: number;
  anonSpent: number;
  /** התקציב שנותר לקורא הזה, לפי הארנק שלו */
  poolBudget: number;
  poolSpent: number;
  callerSpent: number;
  callerBudget: number;
  exceeded: boolean;
  reason: BlockReason;
  ratio: number;
  /** אחוז מהתקרה האישית - הבסיס להתראה על מקור בודד */
  callerRatio: number;
}

/**
 * המצב עבור קורא מסוים. **זו הפונקציה שהשערים קוראים.**
 */
export async function budgetFor(identity: string): Promise<BudgetState> {
  const s = today();
  const budget = await dailyBudgetUsd();
  await sync(s);
  const anon = isAnonIdentity(identity);
  const callerSpent = await callerSpend(s, identity);

  /*
    הארנק של הקורא.

    אנונימי: חלק קבוע מהיום, ותו לא.
    מחובר: כל מה שאנונימיים לא הוציאו - כלומר לפחות `1-ANON_SHARE`
    ותמיד יותר מזה כשהם שקטים. אין מסלול שבו אנונימי מוריד את הרצפה.
  */
  /*
    ה-`min` אינו קישוט. בדיקת התקרה קורית **לפני** הקריאה, ולכן
    הקריאה האחרונה של אנונימי יכולה לחצות את הארנק שלו במעט - ובלי
    ההגבלה הזאת החריגה הייתה נגרעת מהרצפה של המחוברים. הטסט תפס את
    זה בדיוק: 11 מבקרים הוציאו $1.65 מתוך ארנק של $1.50, והרצפה של
    המחוברים ירדה מ-$3.50 ל-$3.35. הבטחה שנשחקת היא לא הבטחה.
  */
  const anonDraw = Math.min(s.anonUsd, budget * ANON_SHARE);
  const poolBudget = anon ? budget * ANON_SHARE : budget - anonDraw;
  const poolSpent = anon ? s.anonUsd : Math.max(0, s.usd - s.anonUsd);
  /*
    **מספר מוחלט, לא אחוז מהיום.**

    ה-`min` מול היום הוא השומר היחיד שנשאר: אם מישהו יוריד את התקרה
    היומית ב-/admin ל-$1, תקרה אישית של $3 הייתה גדולה מהיום כולו
    ומאבדת כל משמעות. מעבר לזה שני המספרים עצמאיים לחלוטין - וזה
    בדיוק מה שמאפשר להוריד את היום בלי לגעת באף סשן.
  */
  const callerBudget = Math.min(anon ? ANON_CALLER_CAP_USD : CALLER_CAP_USD, budget);

  let reason: BlockReason = null;
  if (budget <= 0) reason = 'total';
  else if (persistent() && Date.now() - s.lastOk > FAIL_CLOSED_MS) reason = 'unmeasured';
  else if (callerSpent >= callerBudget) reason = 'caller';
  else if (poolSpent >= poolBudget) reason = anon ? 'anon-pool' : 'total';

  return {
    budget,
    spent: s.usd,
    anonSpent: s.anonUsd,
    poolBudget,
    poolSpent,
    callerSpent,
    callerBudget,
    exceeded: reason !== null,
    reason,
    ratio: budget > 0 ? s.usd / budget : 1,
    callerRatio: callerBudget > 0 ? callerSpent / callerBudget : 1,
  };
}

/**
 * מתי לאחרונה נגעה בקידומת קריאה כבדה **אמיתית** - כלומר מתי המטמון
 * רוענן בפעם האחרונה, כולל חימומים (הם נרשמים כמו כל הוצאה אחרת).
 *
 * `null` = אי אפשר לדעת (אין התמדה, או קריאה שנכשלה). נתיב החימום מפרש
 * את זה כ"לא מחממים": הכיוון הבטוח בספק הוא לא להוציא כסף.
 */
export const WARM_IDENTITY = 'system:warm';

/**
 * @param realOnly להתעלם מהחימומים שלנו עצמנו ולהסתכל רק על תנועה אנושית.
 *
 * **בלי הדגל הזה החימום היה מנציח את עצמו.** הנתיב רושם את ההוצאה שלו
 * כמו כל קריאה אחרת - וזה נכון, היא באמת עולה כסף - אבל אז הרשומה הזאת
 * היא בעצמה "הנגיעה האחרונה", ולכן 40 דקות אחריה הוא מחמם שוב, ושוב.
 * באתר בלי אף מבקר הוא היה מחזיק מטמון חם עבור אף אחד לנצח.
 */
export async function lastHeavyCallAt(realOnly = false): Promise<number | null> {
  if (!persistent()) return null;
  try {
    const res = await fetch(
      `${supaUrl()}/rest/v1/ai_spend?${pgQuery(
        eq('route', 'chat'),
        ...(realOnly ? [neq('identity', WARM_IDENTITY)] : []),
        pgSelect(['at']),
        'order=at.desc',
        'limit=1',
      )}`,
      { headers: headers(), cache: 'no-store', signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { at?: string }[];
    const at = rows[0]?.at ? Date.parse(rows[0].at) : NaN;
    return Number.isFinite(at) ? at : null;
  } catch {
    return null;
  }
}

/** מצב כללי לתצוגה בלבד (אזור הניהול) - בלי הקשר של קורא */
export async function budgetOverview(): Promise<{
  budget: number;
  spent: number;
  anonSpent: number;
  userSpent: number;
  ratio: number;
  stale: boolean;
}> {
  const s = today();
  const budget = await dailyBudgetUsd();
  await sync(s);
  return {
    budget,
    spent: s.usd,
    anonSpent: s.anonUsd,
    userSpent: Math.max(0, s.usd - s.anonUsd),
    ratio: budget > 0 ? s.usd / budget : 1,
    stale: persistent() && Date.now() - s.lastOk > FAIL_CLOSED_MS,
  };
}

/* ---------- רישום ---------- */

/**
 * העלות של קריאה אחת, כולל טיפול בדיווח חסר.
 *
 * `streamedChars` הוא אורך הטקסט שהוזרם בפועל. הוא משמש **רק** כשאין
 * `output_tokens` - כלומר כשהתשובה נקטעה לפני `message_delta` - ואז
 * עדיף אומדן שמרני על פני אפס: הטוקנים האלה כבר חויבו.
 */
export function measuredCost(model: string, u: TokenUsage, streamedChars = 0): number {
  const reported = costUsd(model, u);
  const nothingReported =
    !u.input_tokens && !u.cache_creation_input_tokens && !u.cache_read_input_tokens;

  if (u.output_tokens === undefined && streamedChars > 0) {
    // עברית היא בערך טוקן לתו-שניים; חצי מהתווים הוא אומדן זהיר ולא נדיב
    const est = { ...u, output_tokens: Math.ceil(streamedChars / 2) };
    return costUsd(model, est);
  }
  if (nothingReported && !u.output_tokens) {
    // קריאה שלא דיווחה כלום - לא סופרים אותה כחינם
    return reported > 0 ? reported : UNMEASURED_CALL_USD;
  }
  return reported;
}

export function recordSpend(entry: {
  identity: string;
  userId: string | null;
  tripId: string | null;
  route: 'chat' | 'generate-trip';
  model: string;
  usage: TokenUsage;
  /** אורך הטקסט שהוזרם - לאומדן כשהדיווח חסר */
  streamedChars?: number;
}): number {
  const amount = measuredCost(entry.model, entry.usage, entry.streamedChars ?? 0);
  if (!(amount > 0)) return 0;
  const s = today();
  const anon = isAnonIdentity(entry.identity);
  s.usd += amount;
  if (anon) s.anonUsd += amount;
  s.callers.set(entry.identity, (s.callers.get(entry.identity) ?? 0) + amount);
  if (s.callers.size > 20_000) s.callers.clear(); // הגנת זיכרון גסה

  if (!persistent()) return amount;

  const usdRounded = Number(amount.toFixed(6));
  fetch(`${supaUrl()}/rest/v1/ai_spend`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=minimal' },
    body: JSON.stringify({
      day: s.day,
      identity: entry.identity,
      user_id: entry.userId,
      trip_id: entry.tripId,
      route: entry.route,
      model: entry.model,
      in_tokens: entry.usage.input_tokens ?? 0,
      cached_tokens: entry.usage.cache_read_input_tokens ?? 0,
      write_tokens: entry.usage.cache_creation_input_tokens ?? 0,
      out_tokens: entry.usage.output_tokens ?? 0,
      usd: usdRounded,
    }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {});
  fetch(`${supaUrl()}/rest/v1/rpc/bump_ai_spend`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      p_day: s.day,
      p_usd: usdRounded,
      p_anon: anon,
      p_identity: entry.identity,
    }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {});

  return amount;
}

/* ---------- התראות ---------- */

function post(text: string, extra: Record<string, unknown>): void {
  console.warn(`[budget] ALERT ${text}`);
  const hook = process.env.AI_BUDGET_ALERT_WEBHOOK;
  if (!hook) return;
  fetch(hook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // `text` לסלאק, `content` לדיסקורד - אותה הודעה, בלי תלות חדשה
    body: JSON.stringify({ text, content: text, ...extra }),
    signal: AbortSignal.timeout(4000),
  }).catch(() => {});
}

/**
 * שתי התראות שונות, וזה כל העניין.
 *
 * נתנאל: *"תגיד לי באיזה מצב אני - הרבה אנשים רגילים, או מקור אחד
 * שמתנהג מוזר. השני הוא זה שצריך להעיר אותי."*
 *
 * 1. **מקור בודד** - מיידית, ברגע שזהות אחת עברה 60% מהתקרה שלה,
 *    כלומר **לפני** שהיא נחסמת. פעם אחת לזהות ליום.
 * 2. **היום עמוס** - ב-90% מהתקרה, עם סיווג: כמה זהויות פעילות היום
 *    וכמה מהיום לקח הכבד ביותר. זו האבחנה בין "יום טוב" ל"מישהו
 *    יושב עלינו".
 */
export async function maybeAlert(s: BudgetState, identity: string): Promise<void> {
  const day = today();

  // ---- 1. מקור בודד, מיידי ----
  if (s.callerRatio >= CALLER_ALERT_AT && !day.alertedCallers.has(identity)) {
    day.alertedCallers.add(identity);
    const kind = isAnonIdentity(identity) ? 'אנונימי' : 'מחובר';
    post(
      `טיול+ · מקור בודד (${kind}) הוציא $${s.callerSpent.toFixed(2)} היום - ${Math.round(
        s.callerRatio * 100,
      )}% מהתקרה האישית שלו. הוא ייחסם ב-$${s.callerBudget.toFixed(2)} ולא ישפיע על אחרים. שווה מבט.`,
      { kind: 'single-source', identity: identity.slice(0, 40), usd: s.callerSpent },
    );
  }

  // ---- 2. היום מתקרב לתקרה ----
  if (s.ratio < ALERT_AT || s.budget <= 0 || day.alerted) return;

  const callers = [...day.callers.entries()].sort((a, b) => b[1] - a[1]);
  const topShare = day.usd > 0 ? (callers[0]?.[1] ?? 0) / day.usd : 0;
  const active = callers.filter(([, v]) => v > 0).length;
  /*
    הסיווג. מקור אחד שלקח יותר מרבע מהיום הוא ריכוז; עשרות זהויות עם
    חלקים קטנים הן פשוט יום עמוס - וזה הדבר שאסור להעיר עליו.
  */
  const concentrated = topShare >= 0.25;

  if (persistent()) {
    try {
      const res = await fetch(`${supaUrl()}/rest/v1/rpc/claim_ai_spend_alert`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ p_day: day.day }),
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok || (await res.json()) !== true) return; // instance אחר כבר התריע
    } catch {
      return;
    }
  }
  day.alerted = true;

  post(
    concentrated
      ? `טיול+ · ${Math.round(s.ratio * 100)}% מהתקרה היומית ($${day.usd.toFixed(2)} מתוך $${s.budget.toFixed(2)}) - **וזה מרוכז**: המקור הכבד ביותר לקח ${Math.round(topShare * 100)}% מהיום, מתוך ${active} זהויות פעילות. כדאי להסתכל.`
      : `טיול+ · ${Math.round(s.ratio * 100)}% מהתקרה היומית ($${day.usd.toFixed(2)} מתוך $${s.budget.toFixed(2)}) - תנועה מפוזרת על ${active} זהויות, הכבד ביותר ${Math.round(topShare * 100)}%. נראה כמו יום עמוס אמיתי.`,
    { kind: concentrated ? 'concentrated' : 'broad', active, topShare, usd: day.usd },
  );
}

/** לבדיקות בלבד */
export function resetBudgetForTest(init?: Partial<DayState>): void {
  state = { ...fresh(dayKey()), ...init };
}
