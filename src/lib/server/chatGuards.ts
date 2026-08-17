import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';

/**
 * Server only - the cheap gates, i.e. everything that is checked **before**
 * anything is sent to the API and therefore costs zero.
 *
 * ## The rule above all others
 *
 * Netanel was explicit: *"Do not make the normal experience worse - a real
 * person planning a trip should never notice any of this."* Therefore every
 * number here is chosen **far above** what a real person does, and the topic
 * gate is clearly biased toward "answer": doubt works in the traveler's
 * favor, always.
 *
 * ## What is here and what is not
 *
 * Here: message length, conversation length, and topic. All deterministic.
 * Not here: the spending ceiling (`budget.ts`) and the personal quotas
 * (`limits.ts`).
 */

/* ============ 1. Message length ============ */

/**
 * Characters per single message.
 *
 * For comparison: a booking confirmation pasted into the chat is ~1,500
 * characters, and an especially long trip description measured in real
 * conversations is ~600. 8,000 is five times the extreme case, and roughly
 * three pages of text - whoever gets there pasted a document.
 *
 * The message is **rejected, not truncated**: silent truncation means the
 * agent answers half of what was sent, and the traveler does not know which
 * half.
 */
export const MAX_MESSAGE_CHARS = 8_000;

/* ============ 2. Conversation length ============ */

/**
 * User messages in a single conversation.
 *
 * Every turn resends the entire history, so **message number 80 costs more
 * than message number 3**. The history budget (50,000 chars) already trims
 * the content, but it does not stop the growth in the number of turns.
 *
 * A real planning conversation measured here is 10-25 messages. 80 is four
 * such conversations in a row - and beyond that it is no longer the same
 * trip, and starting clean is better.
 */
export const MAX_USER_MESSAGES = 80;

/* ============ 3. Output ============ */

/**
 * Token ceiling for a single reply. Actual replies are 40-200 tokens; even a
 * full trip build, which is the largest JSON the model emits, was truncated
 * once at 2048 and that was already handled by widening to 4096. The ceiling
 * here is the safety floor, not the experience's.
 */
export const MAX_OUTPUT_TOKENS = 4_096;

/**
 * Cost ceiling for a single turn, in dollars.
 *
 * The real danger is not one long reply but a **loop**: a turn runs up to 16
 * iterations, and each one resends the entire prefix.
 *
 * **$0.60 was too low, and for the reason that felled all the other
 * numbers.** The old estimate ("a turn costs $0.01-$0.13") did not account
 * for cache writes: a **cold** turn measured at $0.447, and a cold build turn
 * with two-three iterations reaches exactly $0.6 - meaning the gate would
 * close on a real visitor's first turn. $1.50 is three times a full cold
 * turn, and still 6% of the day.
 */
export const MAX_TURN_USD = 1.5;

/* ============ 4. The topic gate ============ */

/**
 * Signals that the request **is** travel-related. One is enough.
 *
 * The list also includes all destination and country names from the catalog,
 * because "3 days in Kotor" is an unmistakable trip request without a single
 * generic keyword.
 */
const TRAVEL_WORDS =
  /טיול|לטייל|מסלול|חופש|נופש|יעד|לטוס|טיסה|מלון|לינה|לישון|מזוודה|ויזה|דרכון|נחית|נוסע|נסיעה|לנסוע|ימים|יומיים|שבוע|סופ"ש|סופש|אטרקצי|מוזיאון|מסעד|לאכול|כשר|שופינג|חוף|הרים|מפה|עצירה|יום \d|להמליץ|המלצות|לבקר|אירופה|העולם|חו"ל|חול|באיזו עונה|מזג אוויר|esim|eSIM/i;

/** Built once - the names come from the data, at a length that avoids accidental matches */
const CATALOG_NAMES: string[] = [
  ...destinations.flatMap((d) => [d.name, d.nameLocal ?? '']),
  ...countries.flatMap((c) => [c.name, c.nameLocal ?? '']),
]
  .map((s) => s.trim())
  .filter((s) => s.length >= 3);

/**
 * Signals that the request is **clearly** not travel-related.
 *
 * The list is short and aimed at what people actually try: homework, code,
 * translation, creative writing. It does not try to cover everything - a
 * topic gate that tries to block everything ends up blocking "where should I
 * eat" too, and that is the request the product exists for.
 */
const OFF_TOPIC: { re: RegExp; why: string }[] = [
  { re: /```|<\?php|function\s*\(|console\.log|import\s+\w+\s+from|def\s+\w+\(|SELECT\s+.*\s+FROM/i, why: 'קוד' },
  { re: /כתוב לי קוד|תכתוב קוד|תכתוב לי סקריפט|תתקן את הקוד|באג בקוד|פייתון|python|javascript|react|סי שארפ|\bsql\b/i, why: 'תכנות' },
  { re: /שיעורי בית|עבודה בהיסטוריה|עבודת חקר|תפתור|משוואה|אינטגרל|נגזרת|מבחן במתמטיקה|תרגיל במתמטיקה/i, why: 'לימודים' },
  { re: /תתרגם|תרגם לי|translate this|תרגום ל(אנגלית|צרפתית|ספרדית|גרמנית)/i, why: 'תרגום' },
  { re: /כתוב לי (שיר|סיפור|חיבור|נאום|מכתב מוטיבציה|קורות חיים)|תכתוב לי מאמר|תכתוב פוסט/i, why: 'כתיבה' },
  { re: /מתכון|איך מכינים|דיאטה|אימון כושר|ייעוץ רפואי|כאב ראש|תרופה/i, why: 'לא נסיעות' },
  { re: /מי אתה|איזה מודל|what model are you|ignore (all )?previous|התעלם מההוראות|system prompt/i, why: 'לא נסיעות' },
];

export interface TopicVerdict {
  ok: boolean;
  why: string;
}

/**
 * Whether to answer the request at all.
 *
 * **Three conditions must hold together in order to refuse**, and that is the
 * entire protection against refusing a real traveler:
 *
 * 1. there is a clear signal of another topic,
 * 2. there is **no** travel signal at all - including a city or country name
 *    from the catalog,
 * 3. there is **no active trip.** For someone with a trip on screen, almost
 *    every question is a question about it: "translate this menu for me"
 *    while planning Rome is a travel request in every sense. This rule alone
 *    removes most of the risk.
 */
export function topicOk(text: string, hasTrip: boolean): TopicVerdict {
  if (hasTrip) return { ok: true, why: 'יש טיול פעיל' };
  const t = (text ?? '').trim();
  if (!t) return { ok: true, why: 'ריק' };

  const off = OFF_TOPIC.find((o) => o.re.test(t));
  if (!off) return { ok: true, why: 'אין סימן לנושא אחר' };

  if (TRAVEL_WORDS.test(t)) return { ok: true, why: 'יש סימן נסיעות' };
  const lower = t.toLowerCase();
  if (CATALOG_NAMES.some((n) => lower.includes(n.toLowerCase()))) {
    return { ok: true, why: 'שם מהקטלוג' };
  }

  return { ok: false, why: off.why };
}

/* ============ 5. Requests that are not from the site ============ */

/**
 * A bot hitting the route directly.
 *
 * A browser sends `Origin` on every POST, even same-origin - so a request
 * without an `Origin`, or with a foreign origin, did not come from our site.
 * This is not a perfect defense (a header can be forged), but it stops the
 * common case - a script hammering the route - **before we spent a cent**,
 * which is exactly what Netanel asked for.
 *
 * `CHAT_REQUIRE_ORIGIN=off` disables it, in case some proxy swallows the
 * header.
 */
export function sameOriginOk(req: Request): boolean {
  if (process.env.CHAT_REQUIRE_ORIGIN === 'off') return true;
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    const from = new URL(origin).host;
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
    return Boolean(host) && from === host;
  } catch {
    return false;
  }
}

/**
 * Same intent, but for **GET** - and it is not the same check.
 *
 * **A browser does not send `Origin` on a same-origin GET request.** The
 * standard mandates it only for cross-origin requests and non-safe methods,
 * so `sameOriginOk` - written for the chat's POST and correct there -
 * rejects every real GET request from our own site. This is only caught in a
 * browser: `curl` with `-H Origin` passed fine, so the section looked healthy
 * in every server-side check while on screen it was always empty.
 *
 * Therefore the primary signal here is `Sec-Fetch-Site`, which browsers send
 * on GET too and which cannot be forged from JS (it is a forbidden header).
 * `Origin`/`Referer` remain as fallbacks for old browsers. With none of the
 * three - refusal, as before.
 */
export function browserGetOk(req: Request): boolean {
  if (process.env.CHAT_REQUIRE_ORIGIN === 'off') return true;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  if (!host) return false;

  const site = req.headers.get('sec-fetch-site');
  // 'none' is typing in the address bar, and 'cross-site' is exactly what gets blocked
  if (site) return site === 'same-origin';

  for (const name of ['origin', 'referer']) {
    const value = req.headers.get(name);
    if (!value) continue;
    try {
      return new URL(value).host === host;
    } catch {
      return false;
    }
  }
  return false;
}

/* ============ 6. The wordings ============ */

/** Over the spending ceiling. Calm, temporary, no numbers and no excessive apology. */
export const BUDGET_MESSAGE =
  'הסוכן החכם לא זמין כרגע 🙏\n\n' +
  'זה זמני - כדאי לנסות שוב מאוחר יותר היום או מחר. הטיול שלכם שמור ולא נפגע, ואפשר להמשיך לערוך אותו במתכנן: להוסיף ימים, להזיז עצירות, לפתוח ניווט ולהדפיס.';

/**
 * Over the **subscriber's personal ceiling**, not the site ceiling - a
 * different message on purpose. `BUDGET_MESSAGE` above is worded as "the
 * system is busy", and that is a lie to a subscriber whose own-only ceiling
 * is what was hit; nobody else's spending has anything to do with this state
 * (see premiumBudgetFor in budget.ts) and they should not be led to think it
 * does.
 */
export const PREMIUM_BUDGET_MESSAGE =
  'הגעתם לתקרת השימוש החודשית האישית שלכם בתוכנית הפרימיום 🙏\n\n' +
  'זה לא קשור לעומס באתר - זו תקרה אישית שנועדה למנוע ניצול לרעה, לא שימוש אמיתי. היא מתאפסת עם החיוב הבא. אפשר להמשיך לערוך את הטיול ידנית במתכנן בינתיים.';

export const TOO_LONG_MESSAGE =
  'ההודעה הזאת ארוכה מדי בשבילי 🙏\n\n' +
  'אפשר לשלוח אותה בכמה חלקים, או לכתוב בקצרה מה חשוב - מספיק כמה משפטים ואני בונה מזה מסלול.';

export const TOO_MANY_TURNS_MESSAGE =
  'השיחה הזאת ארוכה מאוד 🙏\n\n' +
  'הטיול שלכם שמור ולא נפגע. לחצו על "ניקוי" בראש חלון השיחה כדי להתחיל שיחה נקייה - התוכנית, המפה והסיכות נשארות בדיוק כמו שהן, ואני אמשיך מהמקום שבו הן נמצאות.';

export const OFF_TOPIC_MESSAGE =
  'אני הסוכן של טיול+, ואני יודע לעשות דבר אחד - לתכנן טיולים 🙂\n\n' +
  'ספרו לי לאן בא לכם, מתי, ועם מי - ואני בונה מסלול אמיתי עם מפה.';
