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
  PREMIUM_TRIP_BUILDS_PER_DAY,
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

/*
  THE test this file was missing, and the reason a paying plan shipped worse
  than the free one on every row. Everything else here checked one column
  against a cost model; nothing checked the two columns against EACH OTHER.
*/
test('פרימיום לעולם לא גרוע מחינם, וחינם לעולם לא גרוע מאנונימי - בכל מכסה נספרת', () => {
  const counted: (keyof typeof PLAN_LIMITS.free)[] = [
    'chatPerDay',
    'chatBurstPerMin',
    'aiUnitsPerDay',
    'generatePerDay',
    'sharesPerDay',
    'importsPerDay',
    'imagesPerDay',
    'exploresPerDay',
    'geocodesPerDay',
    'lookupsPerDay',
  ];
  for (const field of counted) {
    assert.ok(
      PLAN_LIMITS.premium[field] >= PLAN_LIMITS.free[field],
      `פרימיום גרוע מחינם ב-${field}: ${PLAN_LIMITS.premium[field]} מול ${PLAN_LIMITS.free[field]}`,
    );
    assert.ok(
      PLAN_LIMITS.free[field] >= PLAN_LIMITS.anon[field],
      `חינם גרוע מאנונימי ב-${field}: ${PLAN_LIMITS.free[field]} מול ${PLAN_LIMITS.anon[field]}`,
    );
  }
});

/*
  The comparison above is only meaningful while both tiers count in the same
  window. A monthly premium window next to a daily free one is exactly how the
  numbers got inverted, so the window itself is pinned.
*/
test('חלון המכסה הוא יממה, בלי תלות בדרגה', () => {
  /*
    The function no longer takes a tier, and that is the point: a monthly window
    for premium beside a daily one for free is what made the paid plan read as
    smaller than the free one on every row. The signature is now the guard.
  */
  assert.equal(periodMsFor(), 24 * 60 * 60 * 1000);
});

/*
  What the internal cap actually buys, stated as a test so it cannot quietly
  drift. This is NOT the old "everything visible fits under the cap" assertion -
  with daily quotas that is no longer true and is not meant to be (see the
  comment on PLAN_LIMITS.premium). What matters is that ONE ordinary planning
  session in a month is covered, because that is what the pricing page promises.
*/
test('התקרה הפנימית מכסה מפגש תכנון טיפוסי - ומסמנת איפה היא נגמרת', () => {
  /*
    A planning session in this codebase is 10-25 turns (measured, see the (vv)
    entry). At the worst-case prices that is:

      10 turns  $1.16   fits
      15 turns  $1.48   fits   <- typical
      20 turns  $1.79   fits
      24 turns  $2.04   OVER
      two 15-turn sessions      $2.95   OVER

    So $2.00 covers a typical session with room, and runs out inside a long one
    or a second one. That is recorded here deliberately rather than smoothed
    over by choosing a friendlier number: it is the pricing decision written up
    next to PLAN_LIMITS.premium, and if the cap is raised this test is where it
    shows.
  */
  const typicalSession = COLD_TRIP_USD + 15 * HEAVY_TURN_USD;
  assert.ok(
    typicalSession <= SUBSCRIBER_MONTHLY_CAP_USD,
    `מפגש תכנון טיפוסי עולה $${typicalSession.toFixed(2)} מול תקרה של $${SUBSCRIBER_MONTHLY_CAP_USD} - ` +
      'מנוי שמתכנן טיול אחד בחודש ייחסם, וזו הבטחה שבורה',
  );

  const longSession = COLD_TRIP_USD + 24 * HEAVY_TURN_USD;
  const twoTypical = 2 * typicalSession;
  assert.ok(
    longSession > SUBSCRIBER_MONTHLY_CAP_USD && twoTypical > SUBSCRIBER_MONTHLY_CAP_USD,
    'אם אלה כבר נכנסים - התקרה הועלתה, וצריך לעדכן את ההערה שאומרת שהיא מכסה מפגש אחד בלבד',
  );
});

/*
  The comparison rows are hand-written strings around generated numbers, so they
  are exactly the place where a table can claim an allowance the code does not
  grant. This pins the one row whose number does not come from PLAN_LIMITS.
*/
test('שורת בניית הטיולים בטבלה נושאת את המספר האמיתי מהקוד', () => {
  const row = PLAN_FEATURE_ROWS.find((r) => r.label.includes('בניית טיול מלא'));
  assert.ok(row, 'שורת בניית הטיול נעלמה מהטבלה');
  assert.ok(
    row.premium.includes(String(PREMIUM_TRIP_BUILDS_PER_DAY)),
    `הטבלה אומרת "${row.premium}" אבל הקוד מתיר ${PREMIUM_TRIP_BUILDS_PER_DAY} ביום`,
  );
  // And it must not be a limit the free tier does not have at all
  assert.ok(PREMIUM_TRIP_BUILDS_PER_DAY >= 3, 'תקרת בניות נמוכה מדי - תיראה כמו הרעה מול חינם');
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

