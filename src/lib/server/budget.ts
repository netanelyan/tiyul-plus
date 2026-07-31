import { dayKey } from '@/lib/server/limits';
import { eq, pgQuery, pgSelect } from '@/lib/server/pgrest';
import { allFlags } from '@/lib/server/flags';
import { costUsd, type TokenUsage } from '@/lib/server/aiCost';

/**
 * שרת בלבד - **תקרת ההוצאה היומית על ה-AI, לכל המשתמשים יחד**.
 *
 * ## למה זה הפריט החשוב ביותר
 *
 * המכסות האישיות מגינות מפני משתמש אחד. הן לא מגינות מפני **אלף
 * משתמשים**: קמפיין שמצליח, קישור שנתפס ברשת, או בוטנט שמחלק את
 * העומס על אלף כתובות - כל אחד מהם עומד בכל מכסה אישית, ויחד הם
 * חשבון שאי אפשר לשלם. נתנאל ניסח את זה מדויק: **עדיף להיות למטה
 * כמה שעות מאשר להתעורר לחשבון.**
 *
 * ## איך זה נאכף
 *
 * לפני כל קריאת מודל נבדק כמה הוצא היום. מעל התקרה - הבקשה נעצרת
 * **לפני** שנשלח משהו ל-API, והמטייל מקבל משפט רגוע בעברית. זו לא
 * שגיאה ולא קריסה: המוצר ממשיך לעבוד, רק הסוכן שותק.
 *
 * ## שלוש רמות של מקור לתקרה, לפי סדר
 *
 * 1. `app_flags.ai_daily_budget_usd` - **שינוי מיידי, בלי דיפלוי**,
 *    מהאזור האישי של הניהול. זה המסלול שנתנאל אמור להשתמש בו.
 * 2. `AI_DAILY_BUDGET_USD` בסביבה - למי שאין לו גישה לדאטהבייס.
 * 3. ברירת מחדל בקוד - כדי שגם התקנה נקייה תהיה מוגנת מהרגע הראשון.
 *
 * ## הספירה עצמה
 *
 * בזיכרון תמיד, ובנוסף ב-`ai_spend_daily` כשיש service role. הזיכרון
 * לבדו מגן על instance בודד; הטבלה היא מה שהופך את התקרה למשותפת.
 * הסנכרון הוא כל 20 שניות ולא בכל בקשה - קריאת דאטהבייס לכל הודעה
 * היא בדיוק סוג העלות שהקובץ הזה בא למנוע.
 *
 * **הכיוון הבטוח לטעות הוא כלפי מטה.** כשלון קריאה מהדאטהבייס משאיר
 * את הספירה המקומית, שהיא תמיד ≤ האמיתית, ולכן במקרה הגרוע התקרה
 * נאכפת קצת מאוחר - לא נעלמת.
 */

/** ברירת המחדל, בדולרים ליום. ראו את ההסבר בסיכום לנתנאל. */
export const DEFAULT_DAILY_BUDGET_USD = 5;

/** מעל האחוז הזה נשלחת התראה, פעם אחת ביום */
export const ALERT_AT = 0.8;

const supaUrl = () => process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
const persistent = () => Boolean(supaUrl() && serviceKey());

const headers = () => ({
  apikey: serviceKey()!,
  Authorization: `Bearer ${serviceKey()!}`,
  'Content-Type': 'application/json',
});

interface DayState {
  day: string;
  usd: number;
  syncedAt: number;
}

let state: DayState = { day: dayKey(), usd: 0, syncedAt: 0 };
const SYNC_MS = 20_000;

function today(): DayState {
  const day = dayKey();
  if (state.day !== day) state = { day, usd: 0, syncedAt: 0 };
  return state;
}

/** התקרה בתוקף כרגע, לפי סדר המקורות שלמעלה */
export async function dailyBudgetUsd(): Promise<number> {
  const flags = await allFlags().catch(() => ({}) as Record<string, unknown>);
  const raw = flags.ai_daily_budget_usd;
  const fromFlag = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (Number.isFinite(fromFlag) && fromFlag >= 0) return fromFlag;

  const fromEnv = Number(process.env.AI_DAILY_BUDGET_USD);
  if (Number.isFinite(fromEnv) && fromEnv >= 0) return fromEnv;

  return DEFAULT_DAILY_BUDGET_USD;
}

/** כמה הוצא היום, לכל המשתמשים יחד */
export async function spentTodayUsd(): Promise<number> {
  const s = today();
  if (persistent() && Date.now() - s.syncedAt > SYNC_MS) {
    s.syncedAt = Date.now();
    try {
      const res = await fetch(
        `${supaUrl()}/rest/v1/ai_spend_daily?${pgQuery(eq('day', s.day), pgSelect(['usd']))}`,
        { headers: headers(), signal: AbortSignal.timeout(3000) },
      );
      if (res.ok) {
        const rows = (await res.json()) as { usd?: number | string }[];
        const remote = Number(rows[0]?.usd ?? 0);
        // max ולא השמה: כתיבות של הרגע האחרון עוד לא בהכרח שם
        if (Number.isFinite(remote) && remote > s.usd) s.usd = remote;
      }
    } catch {
      /* נשארים עם הספירה המקומית - נמוכה מדי ולא גבוהה מדי */
    }
  }
  return s.usd;
}

export interface BudgetState {
  budget: number;
  spent: number;
  /** האם לעצור בקשות חדשות */
  exceeded: boolean;
  ratio: number;
}

export async function budgetState(): Promise<BudgetState> {
  const [budget, spent] = await Promise.all([dailyBudgetUsd(), spentTodayUsd()]);
  // תקרה 0 = כבוי לחלוטין; תקרה שלילית לא קיימת (נחסם בקריאה)
  const ratio = budget > 0 ? spent / budget : 1;
  return { budget, spent, exceeded: budget <= 0 || spent >= budget, ratio };
}

/**
 * רישום עלות של קריאה אחת.
 *
 * מקומי מיד (כדי שהתקרה תתפוס גם בלי דאטהבייס), ומרוחק ברקע. שורת
 * הפירוט ב-`ai_spend` היא מה שמאפשר לראות עלות לפי יום, משתמש וטיול
 * - נתנאל ביקש לדעת כמה עולה טיול אמיתי לפני שהוא קובע מספרים.
 */
export function recordSpend(entry: {
  identity: string;
  userId: string | null;
  tripId: string | null;
  route: 'chat' | 'generate-trip';
  model: string;
  usage: TokenUsage;
}): number {
  const amount = costUsd(entry.model, entry.usage);
  if (!(amount > 0)) return 0;
  const s = today();
  s.usd += amount;

  if (!persistent()) return amount;

  const row = {
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
    usd: Number(amount.toFixed(6)),
  };
  // fire and forget - רישום עלות לא מעכב תשובה למטייל ולא מפיל אותה
  fetch(`${supaUrl()}/rest/v1/ai_spend`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=minimal' },
    body: JSON.stringify(row),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {});
  fetch(`${supaUrl()}/rest/v1/rpc/bump_ai_spend`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_day: s.day, p_usd: Number(amount.toFixed(6)) }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {});

  return amount;
}

/**
 * התראה לפני התקרה.
 *
 * נתנאל ביקש לדעת שמתקרבים, ולא לגלות אחרי שהסוכן כבר כבוי. הנעילה
 * היא בדאטהבייס (`claim_ai_spend_alert` מחזיר true לקורא הראשון
 * בלבד), ולכן ההתראה נשלחת פעם אחת ביום גם כשרצים כמה instances.
 *
 * היעד הוא webhook מהסביבה - כך אפשר להפנות אותו לסלאק, לדיסקורד או
 * לכל שירות שממיר בקשה למייל, בלי להוסיף תלות ובלי לבחור ספק במקומו.
 * בלי כתובת, ההתראה נכתבת ללוג ומופיעה באזור הניהול.
 */
export async function maybeAlert(s: BudgetState): Promise<void> {
  if (s.ratio < ALERT_AT || s.budget <= 0) return;

  if (persistent()) {
    try {
      const res = await fetch(`${supaUrl()}/rest/v1/rpc/claim_ai_spend_alert`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ p_day: today().day }),
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return;
      if ((await res.json()) !== true) return; // instance אחר כבר התריע
    } catch {
      return;
    }
  } else if (alertedLocally === today().day) {
    return;
  }
  alertedLocally = today().day;

  const pct = Math.round(s.ratio * 100);
  const text = `טיול+ · ${pct}% מתקרת ההוצאה היומית על ה-AI ($${s.spent.toFixed(2)} מתוך $${s.budget.toFixed(2)}). מעל 100% הסוכן מפסיק לקבל בקשות עד חצות UTC.`;
  console.warn(`[budget] ALERT ${text}`);

  const hook = process.env.AI_BUDGET_ALERT_WEBHOOK;
  if (!hook) return;
  fetch(hook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // גם `text` וגם `content`: הראשון הוא מה שסלאק מצפה לו, השני דיסקורד.
    body: JSON.stringify({ text, content: text, pct, spent: s.spent, budget: s.budget }),
    signal: AbortSignal.timeout(4000),
  }).catch(() => {});
}

let alertedLocally = '';

/** לבדיקות בלבד */
export function resetBudgetForTest(usdSpent = 0): void {
  state = { day: dayKey(), usd: usdSpent, syncedAt: Date.now() };
  alertedLocally = '';
}
