/**
 * Tests for `effectivePlan` and for role ranking.
 *
 * Why these two specifically: they are the functions where a bug is **a permission
 * granted by mistake**, not a display glitch. A wrong `effectivePlan` means a
 * 30-day grant lasts forever - exactly the kind of bug nobody reports, because it
 * looks like generosity. A wrong `roleAtLeast` means an ordinary user gets into
 * the admin area.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAN_FEATURE_ROWS,
  PLAN_LIMITS,
  PREMIUM_TRIP_BUILDS_PER_MONTH,
  ROLE_RANK,
  SUBSCRIBER_MONTHLY_CAP_USD,
  effectivePlan,
  isRole,
  periodMsFor,
  roleAtLeast,
} from './plans.ts';
import { BUDGET_MESSAGE, PREMIUM_BUDGET_MESSAGE } from './server/chatGuards.ts';

const NOW = Date.UTC(2026, 6, 27, 12, 0, 0);
const iso = (offsetDays: number) => new Date(NOW + offsetDays * 86_400_000).toISOString();

test('חינם נשאר חינם', () => {
  assert.equal(effectivePlan({ plan: 'free' }, NOW), 'free');
  assert.equal(effectivePlan(null, NOW), 'free');
  assert.equal(effectivePlan(undefined, NOW), 'free');
  assert.equal(effectivePlan({}, NOW), 'free');
});

test('פרימיום בלי תאריך = ללא הגבלה (מנוי Stripe פעיל)', () => {
  assert.equal(effectivePlan({ plan: 'premium', plan_until: null }, NOW), 'premium');
  assert.equal(effectivePlan({ plan: 'premium' }, NOW), 'premium');
});

test('הענקה בתוקף = פרימיום', () => {
  assert.equal(effectivePlan({ plan: 'premium', plan_until: iso(1) }, NOW), 'premium');
});

test('הענקה שפגה = חינם. זה כל הטעם של הפונקציה', () => {
  assert.equal(effectivePlan({ plan: 'premium', plan_until: iso(-1) }, NOW), 'free');
});

test('פקיעה היא רגע, לא יום: שנייה אחרי - חינם', () => {
  const exact = new Date(NOW).toISOString();
  assert.equal(effectivePlan({ plan: 'premium', plan_until: exact }, NOW), 'free');
  assert.equal(effectivePlan({ plan: 'premium', plan_until: exact }, NOW - 1000), 'premium');
});

test('תאריך פגום לא שולל מנוי שכבר שולם', () => {
  // The bias here is deliberate: a broken column is our bug, not a reason to take
  // premium away from someone who paid for it. Fix the data, do not punish the user.
  assert.equal(effectivePlan({ plan: 'premium', plan_until: 'לא-תאריך' }, NOW), 'premium');
});

test('plan אחר לגמרי (דאטה לא צפויה) נחשב חינם', () => {
  assert.equal(effectivePlan({ plan: 'PREMIUM', plan_until: null }, NOW), 'free');
  assert.equal(effectivePlan({ plan: 'owner' }, NOW), 'free');
});

test('דירוג התפקידים: כל שער מחייב את התפקיד שלו ומעלה', () => {
  assert.equal(roleAtLeast('owner', 'admin'), true);
  assert.equal(roleAtLeast('owner', 'owner'), true);
  assert.equal(roleAtLeast('admin', 'admin'), true);
  assert.equal(roleAtLeast('admin', 'owner'), false, 'אדמין אינו בעלים');
  assert.equal(roleAtLeast('user', 'admin'), false, 'משתמש רגיל אינו אדמין');
  assert.equal(roleAtLeast('user', 'user'), true);
});

test('הדירוג סידורי ועולה - שער שנוסף בעתיד לא יישבר בשקט', () => {
  assert.ok(ROLE_RANK.user < ROLE_RANK.admin);
  assert.ok(ROLE_RANK.admin < ROLE_RANK.owner);
});

test('isRole דוחה כל מה שאינו אחד משלושת התפקידים', () => {
  for (const good of ['user', 'admin', 'owner']) assert.equal(isRole(good), true);
  for (const bad of ['Owner', 'ADMIN', 'superuser', '', null, undefined, 0, 1, {}, ['admin']]) {
    assert.equal(isRole(bad), false, `${JSON.stringify(bad)} אינו תפקיד`);
  }
});

/* ============================================================
   Two of Netanel's rules about the visible quotas, locked down as tests
   ============================================================

   1. **"If someone is cut off by the dollar ceiling while the page told them they
      had trips remaining, that is a broken promise and a refund."** That is: the
      cost of all the visible quotas together, at the worst realistic measured
      prices, must fit under the internal dollar ceiling - with margin. Anyone
      raising a displayed number has to break this test first, and then redo the
      arithmetic.

   2. **"A dollar figure must never appear anywhere a user can see - counts only."**
      Shekels for a product price are allowed (a price is not a cost ceiling);
      dollars are not.
*/

/*
  The measured prices (31.7, and the (tt) measurement): these are the **facts** the
  arithmetic rests on. If a new measurement moves them - update here and let the
  test say whether the quotas still fit.
*/
const COLD_TRIP_USD = 0.53; // a full trip build, including a cold cache write
const HEAVY_TURN_USD = 0.063; // a Sonnet turn from a warm cache
const WIZARD_BUILD_USD = 0.02; // a quick Haiku build (measured ~$0.01, doubled to be conservative)
const LOOKUP_USD = 0.01; // one live web search (a fixed Anthropic price)
const IMAGE_EXTRA_USD = 0.01; // what an image adds on top of an ordinary turn

test('העלות הגרועה-המציאותית של כל המכסות הנראות של פרימיום נכנסת מתחת לתקרה - עם מרווח', () => {
  const p = PLAN_LIMITS.premium;
  /*
    Full builds are counted inside the chat quota (a build is a chat), so the
    non-build chats are the difference. This is exactly how the gate actually
    works in chat/route.ts.
  */
  const editTurns = p.chatPerDay - PREMIUM_TRIP_BUILDS_PER_MONTH;
  const worst =
    PREMIUM_TRIP_BUILDS_PER_MONTH * COLD_TRIP_USD +
    editTurns * HEAVY_TURN_USD +
    p.generatePerDay * WIZARD_BUILD_USD +
    p.lookupsPerDay * LOOKUP_USD +
    p.imagesPerDay * IMAGE_EXTRA_USD;

  /*
    90% of the ceiling is the line: the remaining margin absorbs one stray partial
    cold call (a case our warmer is supposed to prevent) and pricing drift. Beyond
    the visible quotas there is no realistic path to the ceiling - only deliberate
    abuse of tool loops, which is capped anyway by MAX_TURN_USD per turn, and that
    is exactly the kind of use the ceiling exists for.
  */
  assert.ok(
    worst <= SUBSCRIBER_MONTHLY_CAP_USD * 0.9,
    `worst=$${worst.toFixed(3)} מול תקרה $${SUBSCRIBER_MONTHLY_CAP_USD} - המכסות הנראות גדולות מדי, ` +
      'המשתמש עלול להיחסם על ידי תקרת הדולרים לפני שהמכסה המוצגת נגמרת',
  );
});

test('הבניות המלאות לא יכולות לעלות לבדן על התקרה, גם אם כל השאר אפס', () => {
  assert.ok(PREMIUM_TRIP_BUILDS_PER_MONTH * COLD_TRIP_USD < SUBSCRIBER_MONTHLY_CAP_USD);
});

test('אף דולר בשורות ההשוואה של עמוד הפרימיום - רק ספירות ושקלים', () => {
  for (const row of PLAN_FEATURE_ROWS) {
    for (const text of [row.label, row.free, row.premium]) {
      assert.ok(!text.includes('$'), `דולר בשורת השוואה: "${text}"`);
      assert.ok(!/USD|דולר/i.test(text), `אזכור דולר בשורת השוואה: "${text}"`);
    }
  }
});

test('אף דולר בהודעות החסימה שהמשתמש רואה', () => {
  for (const msg of [BUDGET_MESSAGE, PREMIUM_BUDGET_MESSAGE]) {
    assert.ok(!msg.includes('$'), `דולר בהודעת משתמש: "${msg.slice(0, 60)}..."`);
    assert.ok(!/דולר/.test(msg), `אזכור דולר בהודעת משתמש`);
  }
});

test('חלון המכסה: יממה לאנונימי/חינם, 30 יום לפרימיום', () => {
  const DAY = 24 * 60 * 60 * 1000;
  assert.equal(periodMsFor('anon'), DAY);
  assert.equal(periodMsFor('free'), DAY);
  assert.equal(periodMsFor('premium'), 30 * DAY);
});
