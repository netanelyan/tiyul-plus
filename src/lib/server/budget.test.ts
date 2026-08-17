/**
 * The two wallets and the personal cap.
 *
 * The central claim tested here is **negative**: there is no path in which
 * anonymous traffic switches the agent off for signed-in users. That was the
 * problem Netanel pointed at, and it turns a cost problem into an outage.
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANON_CALLER_CAP_USD,
  CALLER_ALERT_AT,
  CALLER_CAP_USD,
  DEFAULT_ANON_SHARE,
  IP_BACKSTOP_MULTIPLE,
  PREMIUM_ALERT_AT,
  anonShare,
  budgetFor,
  isAnonIdentity,
  maybeAlert,
  maybeAlertPremium,
  measuredCost,
  monthKey,
  premiumBudgetFor,
  premiumSpendOverview,
  recordSpend,
  resetBudgetForTest,
  sendTestAlert,
} from './budget.ts';
import { periodMsFor, SUBSCRIBER_MONTHLY_CAP_USD } from '../plans.ts';

import { DEFAULT_DAILY_BUDGET_USD } from './budget.ts';

// Read from the code, not written here: a hardcoded number in a test breaks
// on every budget tuning, and these tests check **ratios**, not the cap's level.
const BUDGET = DEFAULT_DAILY_BUDGET_USD;
// With no flag and no env var, anonShare() falls exactly to the default -
// see its dedicated tests below, which check the priority chain itself.
const ANON_SHARE = DEFAULT_ANON_SHARE;

/*
  A mock for the global fetch, for the alert tests only: the rest of the file
  never actually calls fetch (persistent() is false without SUPABASE_URL), so
  this mock changes the behavior of no other test here - it only captures what
  goes out to the webhook.
*/
const realFetch = globalThis.fetch;
let calls: { url: string; body: unknown }[] = [];
/** null = fetch succeeds (200); a number = a failing status code; 'throw' = the network goes down */
let mockOutcome: 'ok' | number | 'throw' = 'ok';

beforeEach(() => {
  calls = [];
  mockOutcome = 'ok';
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null });
    if (mockOutcome === 'throw') throw new Error('network down');
    const status = mockOutcome === 'ok' ? 200 : mockOutcome;
    return new Response('{}', { status });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.AI_BUDGET_ALERT_WEBHOOK;
});

const spend = (identity: string, usd: number) => {
  // Direct recording: the price is computed from tokens, so we craft a usage
  // that lands exactly on the desired amount - haiku output is $5 per million,
  // i.e. 200,000 tokens per dollar
  recordSpend({
    identity,
    userId: identity.startsWith('user:') ? 'u' : null,
    tripId: null,
    route: 'chat',
    model: 'claude-haiku-4-5',
    usage: { output_tokens: Math.round(usd * 200_000) },
  });
};

/* ---------- Wallet separation ---------- */

test('אנונימי מוגבל לחלק שלו מהיום', async () => {
  resetBudgetForTest();
  const s = await budgetFor('anon:aaaaaaaaaaaaaaaa');
  assert.equal(s.poolBudget, BUDGET * ANON_SHARE);
  assert.equal(s.exceeded, false);
});

test('**אנונימיים ששרפו את הארנק שלהם לא נוגעים במחוברים**', async () => {
  resetBudgetForTest();
  /*
    Eleven anonymous visitors, each a tenth of the wallet - i.e. slightly over
    the whole wallet. The deliberate overshoot is so we do not sit exactly on
    the boundary: summing a tenth ten times is 1.4999999999999998 in floating
    point, and a test relying on exact equality there is a broken test, not a
    broken feature.
  */
  for (let i = 0; i < 11; i++) spend(`anon:${'b'.repeat(15)}${i}`, (BUDGET * ANON_SHARE) / 10);

  const anon = await budgetFor('anon:cccccccccccccccc');
  assert.equal(anon.exceeded, true, 'אנונימי חדש נחסם');
  assert.equal(anon.reason, 'anon-pool');

  const user = await budgetFor('user:someone');
  assert.equal(user.exceeded, false, 'מחובר ממשיך כרגיל - זו כל הנקודה');
  /*
    **The floor is absolute.** Anonymous callers overshot their wallet here
    ($1.65 out of $1.50), because the cap is checked before a call, not after
    - and the overshoot must not be subtracted from signed-in users. This test
    failed in the first version, and the min in budget.ts was added because of
    it.
  */
  assert.ok(user.poolBudget >= BUDGET * (1 - ANON_SHARE) - 1e-9, String(user.poolBudget));
});

test('ביום שקט מבחינת אנונימיים, מחוברים מקבלים את כל התקציב', async () => {
  /*
    Two hard wallets would have created the mirror problem - blocking
    signed-in users while 30% sits unused. This is the test that prevents
    going back there.
  */
  resetBudgetForTest();
  const user = await budgetFor('user:someone');
  assert.equal(user.poolBudget, BUDGET);
});

/* ---------- The personal cap ---------- */

test('זהות אחת לא יכולה לקחת חלק גדול מהיום', async () => {
  resetBudgetForTest();
  const id = 'user:heavy';
  spend(id, CALLER_CAP_USD);
  const s = await budgetFor(id);
  assert.equal(s.exceeded, true);
  assert.equal(s.reason, 'caller');
  // And others were not harmed
  assert.equal((await budgetFor('user:other')).exceeded, false);
});

/**
 * **The personal cap is an absolute number and is not derived from the day**
 * - this is the change that allows lowering the daily ceiling without cutting
 * anyone off mid-session. The test checks both claims: the same amount for
 * anonymous and signed-in, and independence from the day's level.
 */
test('התקרה האישית מוחלטת, זהה לשתי השכבות, ולא זזה עם היום', async () => {
  resetBudgetForTest();
  const s = await budgetFor('anon:dddddddddddddddd');
  assert.equal(s.callerBudget, ANON_CALLER_CAP_USD);
  assert.equal(s.callerBudget, CALLER_CAP_USD, 'אותה תקרה שמקבל מחובר');

  /*
    The central claim: the day moves fourfold - $40 then $10 - **and the
    personal cap does not move at all**. In the previous version (12% of the
    day) it would have been $4.80 then $1.20, i.e. in the second case less
    than one session. Both values here are above $3 on purpose, so the claim
    is about independence and not about the clamping.
  */
  for (const day of [40, 10]) {
    resetBudgetForTest();
    process.env.AI_DAILY_BUDGET_USD = String(day);
    const at = await budgetFor('anon:dddddddddddddddd');
    delete process.env.AI_DAILY_BUDGET_USD;
    assert.equal(at.budget, day, 'היום באמת השתנה');
    assert.equal(at.callerBudget, CALLER_CAP_USD, `התקרה האישית נגררה אחרי יום של $${day}`);
  }
});

/** The one guard that remains: a personal cap cannot exceed the whole day */
test('תקרה יומית קטנה מהתקרה האישית גוזמת אותה', async () => {
  resetBudgetForTest();
  process.env.AI_DAILY_BUDGET_USD = '1';
  const s = await budgetFor('user:x');
  delete process.env.AI_DAILY_BUDGET_USD;
  assert.equal(s.callerBudget, 1);
});

/**
 * The claim all this calibration exists for: **a full anonymous planning
 * session fits inside the personal cap**. The numbers are a measurement
 * (July 31): a cold call $0.447, a warm call $0.063, and the anonymous tier's
 * message quota is 25.
 */
test('סשן תכנון אנונימי מלא לא נחסם', async () => {
  resetBudgetForTest();
  const id = 'anon:eeeeeeeeeeeeeeee';
  const COLD = 0.447;
  const WARM = 0.063;
  // The worst case: two cold calls (a long pause in the middle) plus 23 warm ones
  spend(id, COLD * 2 + WARM * 23);
  const s = await budgetFor(id);
  assert.equal(s.exceeded, false, `סשן מלא עלה ${s.callerSpent} מול תקרה ${s.callerBudget}`);
  assert.ok(s.callerBudget > COLD * 2 + WARM * 23, 'ובנוחות, לא בדיוק');
});

/**
 * This number deliberately went down when the day dropped from $25 to $10: it
 * now takes **four** abusers to exhaust a day, not eight. That is the
 * conscious cost of lowering exposure from $750 to $300 a month - and the
 * real brake is not the money anyway but the daily message quota and the
 * burst limit, which are hit much earlier.
 */
test('עדיין צריך כמה מנצלים כדי למצות את היום', () => {
  const perDay = DEFAULT_DAILY_BUDGET_USD / CALLER_CAP_USD;
  assert.ok(perDay >= 3, String(perDay));
});

/** The signed-in floor was not harmed by raising the anonymous share */
test('למחוברים נשארת רצפה אמיתית', () => {
  assert.ok(1 - ANON_SHARE >= 0.4, String(1 - ANON_SHARE));
});

/* ---------- The anonymous share - tunable without a deploy ---------- */

/**
 * `anonShare()` and its counterpart `dailyBudgetUsd()` must go together: the
 * same priority chain (flag → env → default), because these are the two
 * numbers meant to be changed from /admin **in exactly the same way** during
 * launch.
 */
test('ברירת המחדל של anonShare() נותנת לאנונימיים את החלק הגדול', async () => {
  resetBudgetForTest();
  assert.equal(await anonShare(), DEFAULT_ANON_SHARE);
  assert.ok(DEFAULT_ANON_SHARE > 0.5, 'זו כל הבקשה - אנונימי גדול ממחובר כברירת מחדל');
});

test('משתנה סביבה דורס את ברירת המחדל, בדיוק כמו בתקרה היומית', async () => {
  process.env.AI_ANON_SHARE = '0.8';
  try {
    assert.equal(await anonShare(), 0.8);
  } finally {
    delete process.env.AI_ANON_SHARE;
  }
});

test('ערך env מחוץ לטווח 0..1 נופל לברירת המחדל ולא נזרק כשגיאה', async () => {
  process.env.AI_ANON_SHARE = '5'; // 500%, a classic human error
  try {
    assert.equal(await anonShare(), DEFAULT_ANON_SHARE);
  } finally {
    delete process.env.AI_ANON_SHARE;
  }
});

/**
 * **The claim all of this exists for**: whatever value anonShare() returns -
 * 20%, 55%, 90% - the signed-in floor is always `1 - share`, and no anonymous
 * overshoot bites into it. Exactly the same test as "anonymous callers who
 * burned their wallet do not touch signed-in users" above, only with an
 * extreme share value.
 */
test('גם עם anonShare() גבוה מאוד, אנונימי שחורג לא נוגס ברצפה של המחובר', async () => {
  resetBudgetForTest();
  process.env.AI_ANON_SHARE = '0.9';
  try {
    for (let i = 0; i < 11; i++) spend(`anon:${'g'.repeat(15)}${i}`, (BUDGET * 0.9) / 10);
    const user = await budgetFor('user:someone-else');
    assert.equal(user.exceeded, false);
    assert.ok(user.poolBudget >= BUDGET * 0.1 - 1e-9, String(user.poolBudget));
  } finally {
    delete process.env.AI_ANON_SHARE;
  }
});

/* ---------- IP as a safety net, not as a quota ---------- */

test('תקרת ה-IP רחבה בהרבה מתקרת אדם - בגלל CGNAT', async () => {
  resetBudgetForTest();
  const person = await budgetFor('anon:eeeeeeeeeeeeeeee');
  const ip = await budgetFor('ip:1.2.3.4');
  // The network is checked in the route as a multiple; here we make sure the multiplier is actually wide
  assert.ok(IP_BACKSTOP_MULTIPLE >= 20, String(IP_BACKSTOP_MULTIPLE));
  assert.ok(ip.callerBudget * IP_BACKSTOP_MULTIPLE > person.callerBudget * 10);
});

test('מזהה דפדפן נחשב אנונימי בדיוק כמו IP', () => {
  assert.equal(isAnonIdentity('anon:ffffffffffffffff'), true);
  assert.equal(isAnonIdentity('ip:1.2.3.4'), true);
  assert.equal(isAnonIdentity('user:abc'), false);
});

/* ---------- Measurement that fails closed ---------- */

test('קריאה בלי output_tokens מוערכת ולא נספרת כחינם', () => {
  /*
    A reply cut off before message_delta - the tokens were already billed.
    Zero here is exactly how the daily total drifts downward.
  */
  const withText = measuredCost('claude-haiku-4-5', { input_tokens: 1000 }, 4000);
  const withoutText = measuredCost('claude-haiku-4-5', { input_tokens: 1000 }, 0);
  assert.ok(withText > withoutText, `${withText} > ${withoutText}`);
});

test('קריאה שלא דיווחה כלום מקבלת עלות שמרנית ולא אפס', () => {
  const c = measuredCost('claude-sonnet-4-5', {}, 0);
  assert.ok(c > 0, String(c));
});

test('דיווח מלא מחושב מהמספרים ולא מאומדן', () => {
  const c = measuredCost('claude-haiku-4-5', { input_tokens: 1_000_000, output_tokens: 0 }, 9999);
  assert.equal(c, 1);
});

/* ---------- The alerts ---------- */

test('התראת מקור בודד יורה לפני החסימה ולא אחריה', () => {
  assert.ok(CALLER_ALERT_AT < 1, String(CALLER_ALERT_AT));
  assert.ok(CALLER_ALERT_AT >= 0.5, 'מוקדם מדי היה מתריע על שימוש רגיל');
});

test('התקרה נעולה כשהתקציב אפס', async () => {
  resetBudgetForTest();
  process.env.AI_DAILY_BUDGET_USD = '0';
  const s = await budgetFor('user:x');
  assert.equal(s.exceeded, true);
  assert.equal(s.reason, 'total');
  delete process.env.AI_DAILY_BUDGET_USD;
});

/*
  Up to here the tests only checked the thresholds as numbers. What was
  missing, and this is an explicit request from Netanel before he runs the
  ceiling close to the edge: proof that the alert **actually goes out to the
  webhook**, not just that the code deciding when to alert is correct. The
  next three tests capture the fetch call itself.
*/

test('התראת מקור בודד באמת יוצאת ל-webhook, פעם אחת לזהות ליום', async () => {
  resetBudgetForTest();
  process.env.AI_BUDGET_ALERT_WEBHOOK = 'https://hooks.example/test';
  const id = 'user:watched';
  spend(id, CALLER_CAP_USD * 0.65);
  const s = await budgetFor(id);
  assert.ok(s.callerRatio >= CALLER_ALERT_AT, String(s.callerRatio));

  await maybeAlert(s, id);
  await new Promise((r) => setTimeout(r, 0)); // flushes the inner fetch's microtask

  assert.equal(calls.length, 1, 'קריאה אחת יצאה ל-webhook');
  assert.equal(calls[0].url, 'https://hooks.example/test');
  const payload = calls[0].body as { text: string; content: string; kind: string };
  assert.ok(payload.text.includes('מקור בודד'), payload.text);
  assert.equal(payload.text, payload.content, 'אותה הודעה לסלאק (text) ולדיסקורד (content)');
  assert.equal(payload.kind, 'single-source');

  // Same identity, same day - does not send again
  const s2 = await budgetFor(id);
  await maybeAlert(s2, id);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls.length, 1, 'לא נשלחת פעמיים לאותה זהות באותו יום');
});

test('התראת מקור בודד לא יוצאת מתחת לסף', async () => {
  resetBudgetForTest();
  process.env.AI_BUDGET_ALERT_WEBHOOK = 'https://hooks.example/test';
  const id = 'user:quiet';
  spend(id, CALLER_CAP_USD * 0.2); // far from CALLER_ALERT_AT
  const s = await budgetFor(id);
  assert.ok(s.callerRatio < CALLER_ALERT_AT, String(s.callerRatio));

  await maybeAlert(s, id);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls.length, 0, 'מתחת לסף - שום דבר לא נשלח');
});

test('התראת התקרה הכללית באמת יוצאת ל-webhook ב-90%, ולא לפני, פעם אחת ביום', async () => {
  resetBudgetForTest();
  process.env.AI_DAILY_BUDGET_USD = '10';
  process.env.AI_BUDGET_ALERT_WEBHOOK = 'https://hooks.example/test';
  try {
    spend('user:heavy-day', 9.5); // 95% of the day, concentrated in one identity
    const s = await budgetFor('user:someone');
    assert.ok(s.ratio >= 0.9, String(s.ratio));

    await maybeAlert(s, 'user:someone');
    await new Promise((r) => setTimeout(r, 0));

    assert.equal(calls.length, 1);
    const payload = calls[0].body as { text: string; kind: string };
    assert.ok(payload.text.includes('90%') || /9\d%/.test(payload.text), payload.text);
    assert.equal(payload.kind, 'concentrated', 'זהות אחת לקחה את כל היום - זה ריכוז, לא יום עמוס');

    // Another call the same day - does not send again
    const s2 = await budgetFor('user:someone-else');
    await maybeAlert(s2, 'user:someone-else');
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(calls.length, 1, 'ההתראה הכללית לא נשלחת פעמיים באותו יום');
  } finally {
    delete process.env.AI_DAILY_BUDGET_USD;
  }
});

/* ---------- sendTestAlert: what Netanel will actually press on /admin ---------- */

test('sendTestAlert מדווחת "לא מוגדר" כשאין webhook, בלי לזרוק', async () => {
  const r = await sendTestAlert();
  assert.equal(r.configured, false);
  assert.equal(r.ok, false);
  assert.equal(calls.length, 0);
});

test('sendTestAlert מאשרת הצלחה אמיתית כשה-webhook עונה 200', async () => {
  process.env.AI_BUDGET_ALERT_WEBHOOK = 'https://hooks.example/test';
  mockOutcome = 'ok';
  const r = await sendTestAlert();
  assert.equal(r.configured, true);
  assert.equal(r.ok, true);
  assert.equal(calls.length, 1);
  const payload = calls[0].body as { text: string };
  assert.ok(payload.text.includes('בדיקת התראה'), payload.text);
});

test('sendTestAlert מדווחת כישלון אמיתי כשה-webhook מחזיר שגיאה, ולא בולעת אותו', async () => {
  process.env.AI_BUDGET_ALERT_WEBHOOK = 'https://hooks.example/test';
  mockOutcome = 500;
  const r = await sendTestAlert();
  assert.equal(r.configured, true);
  assert.equal(r.ok, false);
  assert.ok(r.error?.includes('500'), String(r.error));
});

test('sendTestAlert מדווחת כישלון כשהרשת נופלת (לא רק HTTP שגוי)', async () => {
  process.env.AI_BUDGET_ALERT_WEBHOOK = 'https://hooks.example/test';
  mockOutcome = 'throw';
  const r = await sendTestAlert();
  assert.equal(r.configured, true);
  assert.equal(r.ok, false);
  assert.ok(r.error, 'יש סיבת כישלון, לא רק ok:false שקט');
});

/* ============================================================
   The third wallet: a premium subscriber, fully isolated from the two wallets above
   ============================================================ */

/** Same idea as spend() above, but attributes to a subscriber's spend */
const spendPremium = (userId: string, usd: number) => {
  recordSpend({
    identity: `user:${userId}`,
    userId,
    tripId: null,
    route: 'chat',
    model: 'claude-haiku-4-5',
    usage: { output_tokens: Math.round(usd * 200_000) },
    premium: true,
  });
};

test('הוצאה של מנוי פרימיום לא נוגעת בתקציב היומי המשותף (usd/anonUsd)', async () => {
  resetBudgetForTest();
  // Baseline before: a full daily budget, because nobody has spent anything yet
  const before = await budgetFor('user:free-signed-in');
  assert.equal(before.poolSpent, 0);

  // A premium subscriber spends a large amount - close to their monthly cap
  spendPremium('prem-1', SUBSCRIBER_MONTHLY_CAP_USD * 0.9);

  // The shared daily budget of free signed-in users does not move at all
  const after = await budgetFor('user:free-signed-in');
  assert.equal(after.poolSpent, 0, 'הוצאת הפרימיום נכנסה לתקציב היומי המשותף - זה בדיוק הבאג שאסור');
  assert.equal(after.exceeded, false);
});

test('הוצאה כבדה של אנונימי/חינם לא נוגעת בתקרה החודשית של מנוי פרימיום', async () => {
  resetBudgetForTest();
  // Exhaust the whole shared daily budget with anonymous traffic
  for (let i = 0; i < 11; i++) spend(`anon:${'e'.repeat(15)}${i}`, (BUDGET * ANON_SHARE) / 10);
  assert.equal((await budgetFor('anon:zzzzzzzzzzzzzzzz')).exceeded, true, 'ודאות שהתקציב המשותף באמת מוצה');

  // A premium subscriber who has never spent anything this month is not affected at all
  const premium = await premiumBudgetFor('prem-untouched');
  assert.equal(premium.spent, 0);
  assert.equal(premium.exceeded, false);
});

test('premiumBudgetFor חוסמת בתקרה החודשית ($2.00), ולא לפני', async () => {
  resetBudgetForTest();
  const under = await premiumBudgetFor('prem-under');
  assert.equal(under.budget, SUBSCRIBER_MONTHLY_CAP_USD);
  assert.equal(under.exceeded, false);

  spendPremium('prem-at-cap', SUBSCRIBER_MONTHLY_CAP_USD);
  const at = await premiumBudgetFor('prem-at-cap');
  assert.equal(at.exceeded, true);

  spendPremium('prem-just-under', SUBSCRIBER_MONTHLY_CAP_USD - 0.01);
  const justUnder = await premiumBudgetFor('prem-just-under');
  assert.equal(justUnder.exceeded, false);
});

test('שני מנויי פרימיום לא רואים את ההוצאה זה של זה', async () => {
  resetBudgetForTest();
  spendPremium('prem-alice', SUBSCRIBER_MONTHLY_CAP_USD); // exhausts only herself
  const alice = await premiumBudgetFor('prem-alice');
  const bob = await premiumBudgetFor('prem-bob');
  assert.equal(alice.exceeded, true, 'אליס מיצתה את שלה');
  assert.equal(bob.exceeded, false, 'בוב לא נגע בכלום - לא אמור להיחסם');
  assert.equal(bob.spent, 0);
});

test('recordSpend עם premium:true בלי userId מתייחס כלא-פרימיום (אין למי לזקוף חודשית)', async () => {
  resetBudgetForTest();
  const before = await budgetFor('user:someone-else');
  assert.equal(before.poolSpent, 0);
  recordSpend({
    identity: 'user:no-id-somehow',
    userId: null,
    tripId: null,
    route: 'chat',
    model: 'claude-haiku-4-5',
    usage: { output_tokens: 100_000 }, // $0.50
    premium: true, // marked premium but there is no userId
  });
  // Without a userId the spend falls back to the regular path and goes into the general usd - it does not vanish quietly
  const after = await budgetFor('user:someone-else');
  assert.ok(after.poolSpent > 0, 'ההוצאה לא נעלמה - נזקפה לארנק הרגיל כמצופה');
});

test('monthKey הוא YYYY-MM ועקבי בין קריאות באותו רגע', () => {
  const k = monthKey();
  assert.match(k, /^\d{4}-\d{2}$/);
  assert.equal(k, monthKey());
});

test('periodMsFor: יממה לאנונימי/חינם, 30 יום לפרימיום', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  assert.equal(periodMsFor('anon'), DAY_MS);
  assert.equal(periodMsFor('free'), DAY_MS);
  assert.equal(periodMsFor('premium'), 30 * DAY_MS);
});

test('premiumSpendOverview: סכום, פירוט לפי מנוי, ו"לא נאסף" כשאין התמדה', async () => {
  resetBudgetForTest();

  // Without SUPABASE - reports stored:false, not a zero that looks like a real measurement
  const off = await premiumSpendOverview();
  assert.equal(off.stored, false);
  assert.equal(off.totalUsd, 0);

  // With persistence - reads the month's rows and sorts from most to least expensive
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_test';
  try {
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      assert.ok(url.includes('subscriber_spend_monthly'), url);
      assert.ok(url.includes(`month=eq.${monthKey()}`), 'מסונן לחודש הנוכחי');
      return new Response(
        JSON.stringify([
          { user_id: 'u-heavy', usd: '1.4', requests: 20 },
          { user_id: 'u-light', usd: 0.2, requests: 3 },
        ]),
        { status: 200 },
      );
    }) as typeof fetch;

    const on = await premiumSpendOverview();
    assert.equal(on.stored, true);
    assert.equal(on.subscribers, 2);
    assert.ok(Math.abs(on.totalUsd - 1.6) < 1e-9, String(on.totalUsd));
    assert.equal(on.top[0].userId, 'u-heavy');
    assert.equal(on.capUsd, SUBSCRIBER_MONTHLY_CAP_USD);
  } finally {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
});

test('maybeAlertPremium: מתריעה פעם אחת מעל הסף, לא לפני', async () => {
  const month = monthKey();
  const below = { budget: 2, spent: 1, exceeded: false, ratio: 0.5 };
  maybeAlertPremium(below, 'prem-quiet', month);
  assert.equal(calls.length, 0, 'מתחת לסף - בלי התראה');

  process.env.AI_BUDGET_ALERT_WEBHOOK = 'https://hooks.example/test';
  const above = { budget: 2, spent: 1.7, exceeded: false, ratio: PREMIUM_ALERT_AT + 0.01 };
  maybeAlertPremium(above, 'prem-loud', month);
  await new Promise((r) => setTimeout(r, 0)); // post() is void - give it a tick to complete
  assert.equal(calls.length, 1);
  const payload = calls[0].body as { text: string };
  assert.ok(payload.text.includes('פרימיום'), payload.text);

  // A second time in the same month for the same user - silence
  maybeAlertPremium(above, 'prem-loud', month);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls.length, 1, 'לא מתריעים פעמיים לאותו מנוי באותו חודש');
});
