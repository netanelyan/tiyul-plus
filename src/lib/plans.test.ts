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
  PLAN_RANK,
  PREMIUM_PRICE_ILS,
  PREMIUM_TRIP_BUILDS_PER_DAY,
  PRO_PRICE_ILS,
  PREMIUM_TRIPS_PER_MONTH,
  PRO_TRIPS_PER_MONTH,
  ROLE_RANK,
  SUBSCRIBER_CAP_USD,
  TRIP_BUILDS_PER_DAY,
  effectivePlan,
  grantedPlanFor,
  isRole,
  paidPlanOf,
  periodMsFor,
  planAtLeast,
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
test('הדירוג בין התוכניות סידורי, ו-planAtLeast הוא שער ולא השוואה', () => {
  assert.ok(PLAN_RANK.free < PLAN_RANK.premium);
  assert.ok(PLAN_RANK.premium < PLAN_RANK.pro);
  // The whole reason planAtLeast exists: a pro subscriber must pass every gate
  // that was written for premium. This is the assertion that would have failed
  // on every `=== 'premium'` in the codebase.
  assert.equal(planAtLeast('pro', 'premium'), true, 'פרו חייב לעבור כל שער של פרימיום');
  assert.equal(planAtLeast('premium', 'pro'), false);
  assert.equal(planAtLeast('free', 'premium'), false);
  assert.equal(planAtLeast('pro', 'pro'), true);
});

test('פרו הוא תוכנית בתוקף, ופג תוקף מחזיר לחינם - לא לפרימיום', () => {
  assert.equal(effectivePlan({ plan: 'pro', plan_until: null }, NOW), 'pro');
  assert.equal(effectivePlan({ plan: 'pro', plan_until: iso(1) }, NOW), 'pro');
  // A lapsed pro grant falls to free. Falling to premium would be a paid plan
  // nobody is paying for, which is the generous-looking bug effectivePlan exists for.
  assert.equal(effectivePlan({ plan: 'pro', plan_until: iso(-1) }, NOW), 'free');
  assert.equal(effectivePlan({ plan: 'Pro' }, NOW), 'free', 'ערך לא מוכר לא מעניק כלום');
});

test('paidPlanOf דורש משתמש מחובר - ארנק אישי בלי בעלים אינו ארנק', () => {
  assert.equal(paidPlanOf({ plan: 'pro', userId: 'u1' }), 'pro');
  assert.equal(paidPlanOf({ plan: 'premium', userId: 'u1' }), 'premium');
  assert.equal(paidPlanOf({ plan: 'free', userId: 'u1' }), null);
  // A paid plan with no user id must be treated as free: there is nobody to
  // charge the personal monthly wallet to.
  assert.equal(paidPlanOf({ plan: 'pro', userId: null }), null);
  assert.equal(paidPlanOf({ plan: 'premium' }), null);
});

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
    /*
      And the same rule one tier up. This is the entire lesson of the previous
      inversion, applied before it can happen again rather than after: the more
      expensive plan is never smaller on any countable row.
    */
    assert.ok(
      PLAN_LIMITS.pro[field] >= PLAN_LIMITS.premium[field],
      `פרו גרוע מפרימיום ב-${field}: ${PLAN_LIMITS.pro[field]} מול ${PLAN_LIMITS.premium[field]}`,
    );
  }
  assert.ok(
    TRIP_BUILDS_PER_DAY.pro >= TRIP_BUILDS_PER_DAY.premium,
    'תקרת בניות של פרו נמוכה מזו של פרימיום',
  );
});

/*
  ============================================================
  The pro tier: Netanel's rule, applied strictly this time
  ============================================================

  "A money cap per subscriber, invisible to the user, with the visible allowance
  conservative enough that nobody hits the cap first."

  For premium that rule is currently inverted and the code says so out loud (see
  PLAN_LIMITS.premium): daily quotas cannot fit a monthly cap. For pro it holds,
  because the visible promise is not a daily quota - it is PRO_TRIPS_PER_MONTH,
  a monthly number, and it is sized against the monthly cap directly.
*/
test('הבטחת הנפח של פרו נכנסת מתחת לתקרה הפנימית - גם בתרחיש הגרוע', () => {
  const cap = SUBSCRIBER_CAP_USD.pro;
  const typicalSession = COLD_TRIP_USD + 15 * HEAVY_TURN_USD; // $1.475
  const longSession = COLD_TRIP_USD + 24 * HEAVY_TURN_USD; // $2.040

  const promisedTypical = PRO_TRIPS_PER_MONTH * typicalSession;
  const promisedWorst = PRO_TRIPS_PER_MONTH * longSession;

  /*
    The worst case is what the rule is actually about. Somebody who reads "five
    trips a month" and then edits every one of them obsessively must still not
    meet the money ceiling before the number they were shown - otherwise the
    page made a promise the server breaks, which is a refund.
  */
  assert.ok(
    promisedWorst <= cap,
    `${PRO_TRIPS_PER_MONTH} תכנונים ארוכים עולים $${promisedWorst.toFixed(2)} מול תקרה של $${cap} - ` +
      'ההבטחה בעמוד גדולה מהתקרה, וזו הבטחה שבורה',
  );
  // And with real headroom, not by a hair - 90% would be a rounding error away
  // from the same bug.
  assert.ok(
    promisedWorst <= cap * 0.9,
    `אין מרווח: ${(promisedWorst / cap) * 100}% מהתקרה בתרחיש הגרוע`,
  );
  assert.ok(promisedTypical <= cap * 0.7, 'שימוש טיפוסי צריך להיות רחוק מהתקרה, לא צמוד לה');

  /*
    The other half: the promise must not be so timid that the cap is money we
    charge for and never let anyone use. One more trip than promised should be
    what starts pressing on the ceiling.
  */
  const oneMore = (PRO_TRIPS_PER_MONTH + 1) * longSession;
  assert.ok(
    oneMore > cap * 0.9,
    `אפשר להבטיח יותר מ-${PRO_TRIPS_PER_MONTH} טיולים בלי לגעת בתקרה - ההבטחה קמצנית מדי`,
  );
});

test('פרו יקר יותר מפרימיום, ונותן יותר תקרה לשקל - אחרת אין סיבה לקנות אותו', () => {
  assert.ok(PRO_PRICE_ILS > PREMIUM_PRICE_ILS);
  const priceRatio = PRO_PRICE_ILS / PREMIUM_PRICE_ILS;
  const capRatio = SUBSCRIBER_CAP_USD.pro / SUBSCRIBER_CAP_USD.premium;
  /*
    The tier is volume and nothing else, so if a shekel does not buy more
    capacity here than it does in premium, there is no honest reason for anybody
    to choose it - and a tier nobody could want is exactly what Netanel said not
    to build.
  */
  assert.ok(
    capRatio > priceRatio,
    `פרו יקר פי ${priceRatio.toFixed(2)} ונותן פי ${capRatio.toFixed(2)} בלבד - שדרוג שלא משתלם`,
  );
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
  What premium's cap actually buys, as a test, because the card now STATES it.

  This used to assert the opposite - that a long session did NOT fit - and it
  fired the moment the cap moved, with a message saying to come and update this
  comment. That is the test working: the claim on the page and the number in the
  code are not allowed to drift apart.
*/
test('הבטחת הנפח של פרימיום נכנסת מתחת לתקרה - גם בתרחיש הגרוע', () => {
  const cap = SUBSCRIBER_CAP_USD.premium;
  const typicalSession = COLD_TRIP_USD + 15 * HEAVY_TURN_USD; // $1.475
  const longSession = COLD_TRIP_USD + 24 * HEAVY_TURN_USD; // $2.040

  /*
    The card says "a full trip a month, however much you edit it". The second
    half of that sentence is the whole reason this asserts the LONG session:
    somebody who plans one trip and then keeps fiddling must not be cut off.
  */
  const promisedWorst = PREMIUM_TRIPS_PER_MONTH * longSession;
  assert.ok(
    promisedWorst <= cap,
    `${PREMIUM_TRIPS_PER_MONTH} תכנון ארוך עולה $${promisedWorst.toFixed(2)} מול תקרה של $${cap} - ` +
      'הכרטיס מבטיח יותר ממה שהתקרה נותנת',
  );
  assert.ok(promisedWorst <= cap * 0.9, `אין מרווח: ${Math.round((promisedWorst / cap) * 100)}% מהתקרה`);

  /*
    And the promise is ONE trip and not two - if two typical sessions started
    fitting, the card is understating what it gives and should say so.
  */
  assert.ok(
    2 * typicalSession > cap,
    'שני מפגשים טיפוסיים נכנסים בתקרה - אפשר להבטיח יותר מטיול אחד בחודש',
  );
});

/*
  The two paid tiers are priced on the same structure, and that is deliberate
  rather than a coincidence worth losing. If one drifts, the pricing page's
  "here is the honest arithmetic" section stops being one argument and becomes
  two unrelated numbers.
*/
test('שתי התוכניות בתשלום רצות על אותו מבנה רווחיות', () => {
  const netUsd = (gross: number) => (0.8135 * gross - 1.2) / 3.75; // VAT 18%, PayPal 3.4%+1.20, 3.75 ILS/$
  const margin = (gross: number, cap: number) => 1 - cap / netUsd(gross);
  const premium = margin(PREMIUM_PRICE_ILS, SUBSCRIBER_CAP_USD.premium);
  const pro = margin(PRO_PRICE_ILS, SUBSCRIBER_CAP_USD.pro);
  for (const [name, m] of [['premium', premium], ['pro', pro]] as const) {
    assert.ok(m > 0.3, `${name} ברווחיות ${Math.round(m * 100)}% - דק מדי לתקרה שנמכרת`);
  }
  assert.ok(
    Math.abs(premium - pro) < 0.08,
    `המבנה התפצל: פרימיום ${Math.round(premium * 100)}% מול פרו ${Math.round(pro * 100)}%`,
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
    for (const text of [row.label, row.free, row.premium, row.pro]) {
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

/*
  The grant rule, and it is a money rule rather than a display one: a promo code
  or an admin grant that DEMOTES somebody is a downgrade they never asked for,
  handed to them in the shape of a gift. They would be the ones to discover it.
*/
test('הענקה משדרגת ולעולם לא מורידה', () => {
  // The ordinary cases: somebody gets what the code or the admin offered
  assert.equal(grantedPlanFor('free', 'premium'), 'premium');
  assert.equal(grantedPlanFor('free', 'pro'), 'pro');
  assert.equal(grantedPlanFor('premium', 'pro'), 'pro', 'קוד פרו למנוי פרימיום - משדרג');
  assert.equal(grantedPlanFor('premium', 'premium'), 'premium');
  assert.equal(grantedPlanFor('pro', 'pro'), 'pro');

  // THE case: a premium code redeemed by somebody already on pro
  assert.equal(
    grantedPlanFor('pro', 'premium'),
    'pro',
    'קוד פרימיום הוריד מנוי פרו - זו הורדה שהמשתמש לא ביקש, במסווה של מתנה',
  );
});
