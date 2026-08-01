import { agentModel, anthropicBase, cachedPrefix, cachedTools, warmDecision } from '@/lib/server/agentPrefix';
import { budgetFor, lastHeavyCallAt, measuredCost, recordSpend } from '@/lib/server/budget';
import type { TokenUsage } from '@/lib/server/aiCost';

/**
 * **שמירת קידומת הקטלוג חמה - ורק כשאין מי שישמור אותה בשבילנו.**
 *
 * ## למה זה קיים
 *
 * ההפרש בין קריאה קרה לחמה נמדד: **$0.447 מול $0.063**, וכולו כתיבת
 * המטמון של האינדקס. קריאה מהמטמון **מאריכה את התוקף בחינם**, ולכן
 * מבקר אמיתי מחמם את הקידומת עבור הבא אחריו בלי לשלם על זה כלום.
 *
 * ## שלושת התנאים, וכל אחד מהם הוא סירוב להוציא כסף
 *
 * הנתיב שולח בקשה מינימלית **רק** אם כל אלה מתקיימים:
 *
 * 1. **הייתה שקטה** - לא עברה קריאה כבדה ב-`QUIET_MS` האחרונות. אם
 *    עברה, המטמון כבר רוענן בחינם וחימום הוא בזבוז נטו. **ככל שהאתר
 *    עסוק יותר, הנתיב הזה פועל פחות, ובתנועה יציבה הוא לא פועל בכלל.**
 * 2. **המטמון עוד חי** - הנגיעה האחרונה בתוך `STALE_MS`. אחרי שהתוקף
 *    פג, חימום משלם **כתיבה** מלאה עבור אף אחד; בשלב הזה עדיף לתת
 *    למבקר האמיתי הבא לשלם אותה ממילא. זה גם מה שמונע מהנתיב לשרוף
 *    כסף ביום בלי אף מבקר.
 * 3. **יש תקציב** - התקרה היומית נבדקת כמו בכל קריאה אחרת.
 *
 * ## גרסה אחת בלבד
 *
 * מחומם רק האינדקס **בלי שכבת הכשרות**, שהוא הנפוץ מבין השניים. חימום
 * שתי הגרסאות מכפיל את העלות בשביל הגרסה הנדירה יותר.
 *
 * ## אבטחה
 *
 * הנתיב עולה כסף, ולכן הוא **כבוי כל עוד `CRON_SECRET` לא מוגדר**, וכל
 * מי שאין לו את הסוד מקבל 404 - אותה תשובה שמקבל נתיב שלא קיים.
 */

const notFound = () =>
  new Response(JSON.stringify({ error: 'not_found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });

const skip = (why: string) =>
  new Response(JSON.stringify({ warmed: false, why }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // בלי סוד הפיצ׳ר כבוי, ולא "פתוח לכולם"
  const header = req.headers.get('authorization') ?? '';
  return header === `Bearer ${secret}`;
}

async function handle(req: Request): Promise<Response> {
  if (!authorized(req)) return notFound();
  if (!process.env.ANTHROPIC_API_KEY) return skip('no_key');

  /*
    ההחלטה עצמה יושבת ב-`agentPrefix.ts` כפונקציה טהורה, כי היא
    מה שראוי לבדוק: שלוש מארבע התשובות שלה הן סירוב להוציא כסף.
  */
  const decision = warmDecision(await lastHeavyCallAt(), Date.now());
  if (decision !== 'warm') return skip(decision);

  // תקציב: אותה בדיקה כמו בכל קריאה, עם זהות מערכת משלה
  const budget = await budgetFor('system:warm');
  if (budget.exceeded) return skip(`budget_${budget.reason}`);

  const model = agentModel();
  const res = await fetch(`${anthropicBase()}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      model,
      max_tokens: 1,
      /*
        **בדיוק אותם כלים ואותם בלוקים כמו בצ׳אט**, מ-`agentPrefix.ts`.
        הודעה קצרה אחת אחרי נקודת השבירה - היא לא חלק מהקידומת ולכן לא
        משנה מה כתוב בה.
      */
      tools: cachedTools(),
      system: cachedPrefix(false),
      messages: [{ role: 'user', content: 'ping' }],
    }),
  });

  if (!res.ok) {
    console.error('[warm] failed', res.status, (await res.text().catch(() => '')).slice(0, 200));
    return skip(`api_${res.status}`);
  }

  const data = (await res.json()) as { usage?: TokenUsage };
  const usage = data.usage ?? {};
  const usd = measuredCost(model, usage);
  /*
    נרשם כמו כל הוצאה אחרת - גם כדי שהוא ייספר בתקרה, וגם כי הרישום
    הזה **הוא** סימן הנגיעה האחרון: החימום הבא יראה אותו ולא יחמם שוב.
  */
  recordSpend({
    identity: 'system:warm',
    userId: null,
    tripId: null,
    route: 'chat',
    model,
    usage,
  });

  const wrote = (usage.cache_creation_input_tokens ?? 0) > 0;
  if (wrote) {
    // כתיבה פירושה שהמטמון היה קר - כלומר החלון שלמעלה לא היה מדויק
    console.warn('[warm] paid a cache WRITE, not a read - check QUIET/STALE window');
  }
  return new Response(
    JSON.stringify({
      warmed: true,
      usd,
      read: usage.cache_read_input_tokens ?? 0,
      wrote: usage.cache_creation_input_tokens ?? 0,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

export const GET = handle;
export const POST = handle;
