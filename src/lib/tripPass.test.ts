/**
 * The trip pass grant. Every test here is named after a way the function could
 * take something away from somebody at the exact moment they paid us - which is
 * the only class of bug in this file that a customer would notice and that we
 * would never hear about, because it looks like the product working.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  tripPassGrant,
  tripPassWorthBuying,
  TRIP_PASS_DAYS,
  TRIP_PASS_PRICE_ILS,
  TRIP_PASS_PLAN_SOURCE,
} from './tripPass.ts';
import { PREMIUM_PRICE_ILS, PRO_PRICE_ILS, effectivePlan } from './plans.ts';
import { PRICE_ILS as CHECK_PRICE_ILS } from './predeparture.ts';

const NOW = Date.parse('2026-10-01T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const iso = (t: number) => new Date(t).toISOString();

test('a free account gets premium for exactly the pass window', () => {
  const g = tripPassGrant({ plan: 'free' }, NOW);
  assert.ok(g);
  assert.equal(g.plan, 'premium');
  assert.equal(g.plan_source, TRIP_PASS_PLAN_SOURCE);
  assert.equal(Date.parse(g.plan_until) - NOW, TRIP_PASS_DAYS * DAY);
});

test('an account with no row at all is treated as free, not as an error', () => {
  for (const row of [null, undefined, {}]) {
    const g = tripPassGrant(row, NOW);
    assert.ok(g, `${JSON.stringify(row)} should be sellable`);
    assert.equal(g.plan, 'premium');
  }
});

test('the grant always carries an expiry - a pass is never open-ended', () => {
  /*
    A pass with plan_until null would be a subscription given away for ₪49 once.
    effectivePlan treats a null expiry as "never expires", so this is the single
    field that decides whether this product is a pass or a gift.
  */
  const g = tripPassGrant({ plan: 'free' }, NOW);
  assert.ok(g?.plan_until, 'plan_until must be set');
  assert.equal(effectivePlan(g, NOW), 'premium', 'should be live immediately');
  assert.equal(
    effectivePlan(g, NOW + (TRIP_PASS_DAYS + 1) * DAY),
    'free',
    'and must fall back to free once the window passes',
  );
});

// ---------- rule 1: never demote ----------

test('a pro subscriber who buys a pass stays on pro', () => {
  /*
    Writing 'premium' here would downgrade somebody in the act of paying us. The
    same rule `grantedPlanFor` enforces for promo codes and admin grants.
  */
  const g = tripPassGrant({ plan: 'pro', plan_until: iso(NOW + 10 * DAY), plan_source: 'grant' }, NOW);
  assert.ok(g);
  assert.equal(g.plan, 'pro', 'must not be demoted to premium');
});

// ---------- rule 2: extend, never reset ----------

test('a buyer with time left gets it added, not confiscated', () => {
  const g = tripPassGrant(
    { plan: 'premium', plan_until: iso(NOW + 20 * DAY), plan_source: TRIP_PASS_PLAN_SOURCE },
    NOW,
  );
  assert.ok(g);
  const days = Math.round((Date.parse(g.plan_until) - NOW) / DAY);
  assert.equal(days, 20 + TRIP_PASS_DAYS, 'should be 80 days, not 60');
});

test('an EXPIRED pass extends from now, not from the stale expiry', () => {
  /*
    The mirror of the test above, and the one a naive "always add 60 to
    plan_until" implementation gets wrong: extending from a date in the past sells
    somebody a window that is already partly gone.
  */
  const g = tripPassGrant(
    { plan: 'premium', plan_until: iso(NOW - 30 * DAY), plan_source: TRIP_PASS_PLAN_SOURCE },
    NOW,
  );
  assert.ok(g);
  assert.equal(Date.parse(g.plan_until) - NOW, TRIP_PASS_DAYS * DAY, 'full window from today');
});

test('a corrupt expiry does not produce an Invalid Date', () => {
  const g = tripPassGrant({ plan: 'premium', plan_until: 'not-a-date' }, NOW);
  assert.ok(g);
  assert.ok(Number.isFinite(Date.parse(g.plan_until)), `got ${g.plan_until}`);
  assert.equal(Date.parse(g.plan_until) - NOW, TRIP_PASS_DAYS * DAY);
});

// ---------- rule 3: never shorten an unlimited plan ----------

test('an active unlimited subscriber cannot buy a pass - it would shorten their plan', () => {
  /*
    The worst outcome available in this function: writing a 60-day expiry onto an
    open-ended subscription converts it into one that ENDS. Refusing the sale is
    correct; "upgrading" them into something smaller is not.
  */
  for (const plan of ['premium', 'pro']) {
    const row = { plan, plan_until: null, plan_source: 'paypal' };
    assert.equal(tripPassGrant(row, NOW), null, `${plan} subscriber should not be sold a pass`);
    assert.equal(tripPassWorthBuying(row, NOW), false);
  }
});

test('but an EXPIRED row with a past date is still sellable', () => {
  /*
    The distinction rule 3 has to get right: `plan_until` in the past is not
    "unlimited", it is "over". Reading only `plan` would have refused this sale.
  */
  const row = { plan: 'premium', plan_until: iso(NOW - DAY), plan_source: TRIP_PASS_PLAN_SOURCE };
  assert.equal(effectivePlan(row, NOW), 'free', 'precondition: the row is expired');
  assert.ok(tripPassGrant(row, NOW), 'an expired pass must be renewable');
});

test('an unrecognised plan string is treated as free and sold to', () => {
  // effectivePlan maps anything unknown to free; the grant must agree with it.
  const g = tripPassGrant({ plan: 'PREMIUM', plan_until: null }, NOW);
  assert.ok(g, 'a bogus plan value must not read as an unlimited subscription');
  assert.equal(g.plan, 'premium');
});

// ---------- the ladder ----------

test('the pass costs more than the check it contains - the inversion is gone', () => {
  /*
    This is the defect the product exists to fix, so it is asserted rather than
    trusted to the comment. If a future price change re-inverts the ladder, the
    "subscribe for a month and cancel" arbitrage comes back and /premium has to
    start disclosing it again.
  */
  assert.ok(
    TRIP_PASS_PRICE_ILS > CHECK_PRICE_ILS,
    `the pass (${TRIP_PASS_PRICE_ILS}) must cost more than the check it includes ` +
      `(${CHECK_PRICE_ILS}), or buying the cheap thing is strictly better than buying the ` +
      `expensive one and the ladder inverts again`,
  );
});

test('the ladder rises: check < pass < a month of pro', () => {
  const rungs = [CHECK_PRICE_ILS, TRIP_PASS_PRICE_ILS, PRO_PRICE_ILS];
  assert.deepEqual(
    rungs,
    [...rungs].sort((a, b) => a - b),
    `each step must cost more than the one below it - got ${rungs.join(' -> ')}`,
  );
});

test('the pass earns more per trip than a one-month premium subscription did', () => {
  /*
    The business case for replacing the subscription, checked rather than asserted.
    Netanel's method: less 18% VAT, less PayPal 3.4% + ₪1.20 fixed.
  */
  const net = (gross: number) => {
    const exVat = gross / 1.18;
    return exVat - (exVat * 0.034 + 1.2);
  };
  const WORST_AI_ILS = 2.5 * 3.75; // SUBSCRIBER_CAP_USD.premium at ₪3.75/$

  const passMargin = net(TRIP_PASS_PRICE_ILS) - WORST_AI_ILS;
  const oneMonthMargin = net(PREMIUM_PRICE_ILS) - WORST_AI_ILS;

  assert.ok(passMargin > 0, `the pass must be profitable at the worst case, got ${passMargin.toFixed(2)}`);
  assert.ok(
    passMargin > oneMonthMargin * 2,
    `the pass should earn materially more than the one-month-and-cancel path it ` +
      `replaces: pass ₪${passMargin.toFixed(2)} vs subscription ₪${oneMonthMargin.toFixed(2)}`,
  );
});

test('the pass window outlasts the check window it has to cover', () => {
  /*
    Why 60 days and not 30: the pre-departure check is only offered within 21 days
    of departure, so a pass bought while planning must still be alive when the
    check unlocks. A 30-day pass would expire before the thing it was sold for
    became available.
  */
  assert.ok(
    TRIP_PASS_DAYS >= 45,
    `${TRIP_PASS_DAYS} days is too short to cover planning plus the 21-day check window`,
  );
});

/* ============================================================
 *  The deploy interlock
 *
 *  The grant writes plan_source='trip_pass', which the CHECK constraint rejects until
 *  sql/supabase-trip-pass.sql has run. Without an interlock the deploy would advertise
 *  a ₪49 product whose purchase could not be honoured - money taken, nothing given,
 *  discovered only by the webhook alert afterwards.
 * ============================================================ */

test('**the pass is unsellable by default** - the flag defaults to no, unlike the kill switch', async () => {
  /*
    The opposite default from `agentEnabled`, and deliberately so. There a failed read
    must not silence a working product; here a false "yes" takes money for a grant the
    database will refuse. So: absent flag, wrong type, null, string "true" - all no.
  */
  const { tripPassSellable } = await import('./server/flags.ts');
  const { invalidateFlags } = await import('./server/flags.ts');
  invalidateFlags();
  // With no Supabase configured, load() returns {} - the unconfigured case a fresh
  // deploy is in before the migration runs.
  assert.equal(await tripPassSellable(), false);
});

test('the migration is what turns it on, and it is the last thing it does', () => {
  /*
    Asserted on the SQL text: the flag must be set INSIDE the same DO block as the
    constraint widening and after it, so a failed alter cannot leave the pass sellable.
  */
  const sql = readFileSync(join('sql', 'supabase-trip-pass.sql'), 'utf8');
  const alterAt = sql.indexOf("add constraint profiles_plan_source_check");
  const flagAt = sql.indexOf("'trip_pass_ready'");
  const endAt = sql.indexOf('end\n$$;') === -1 ? sql.indexOf('end\r\n$$;') : sql.indexOf('end\n$$;');
  assert.ok(alterAt > 0, 'the constraint widening is missing');
  assert.ok(flagAt > alterAt, 'the readiness flag is set before the constraint is widened');
  assert.ok(endAt > flagAt, 'the flag is set outside the DO block that can roll back');
  // [\s\S] rather than the /s flag: this tsconfig targets below es2018.
  assert.match(sql, /trip_pass_ready[\s\S]*true/);
});

test('the route checks the interlock before it calls PayPal', () => {
  /*
    Order matters: a check placed after createOrder would already have sent the buyer to
    a payment page. Asserted positionally for that reason.
  */
  const src = readFileSync(join('src', 'app', 'api', 'pass', 'create-order', 'route.ts'), 'utf8');
  const gate = src.indexOf('tripPassSellable()');
  const paypal = src.indexOf('createOrder(mode');
  const pending = src.indexOf('createPendingPurchase(');
  assert.ok(gate > 0, 'the route does not check tripPassSellable at all');
  assert.ok(gate < paypal, 'the interlock runs after PayPal is called');
  assert.ok(gate < pending, 'the interlock runs after a purchase row is written');
});
