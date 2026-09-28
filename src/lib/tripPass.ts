/**
 * The trip pass - one trip, everything, 60 days, ₪49. No subscription.
 *
 * ## Why this product exists, since it replaces one that was live
 *
 * Every single thing premium gave was **per trip**: the pre-departure check, the
 * shared-trip invite, the planning capacity. It was billed **per month**. A
 * per-trip need on a monthly clock produces exactly one outcome - somebody
 * subscribes for the month they are planning in and cancels - so the realistic
 * lifetime value of a ₪19.90 subscription was ₪19.90, once.
 *
 * It was worse than that, because ₪19.90 also sat **below** the ₪29.90
 * pre-departure check that premium included without limit. So the cheapest way to
 * buy a ₪29.90 check was to pay ₪19.90 for a month of premium, take the check and
 * cancel - and `/premium` said so in as many words, on purpose, because the
 * alternative was letting people work it out and feel tricked. Measured with the
 * same net-revenue method as the rest of the pricing: **-35% revenue and -75%
 * margin in the worst case**, on the only product that had ever taken real money.
 *
 * The pass fixes the cause rather than the symptom: it charges per trip, for a
 * per-trip product, at a price above the check it contains. The ladder stops
 * inverting, so the honesty paragraph on `/premium` stops being necessary.
 *
 *   check      ₪29.90   one trip, the report only
 *   trip pass  ₪49      one trip, everything, 60 days
 *   pro        ₪89.90/mo  for people who plan constantly
 *
 * ## The arithmetic
 *
 * Netanel's own method (the one that reproduces the ₪19.90 and ₪89.90 figures in
 * `plans.ts` to the agora): less 18% VAT, less PayPal's 3.4% + ₪1.20.
 *
 *   gross ₪49.00 -> ex-VAT ₪41.53 -> net ₪39.92  ($10.65 at ₪3.75/$)
 *
 * Against a worst-case AI spend of $2.50 (₪9.38) that is **~₪30 of margin per
 * trip**, where a one-month premium subscriber yielded ₪15.09 net minus the same
 * ₪9.38 = **₪5.71**. Five times the margin, for a product that is easier to buy
 * because nothing recurs.
 *
 * ## Why 60 days and not 30
 *
 * People plan a trip over weeks, not in one sitting, and the pre-departure check
 * is deliberately only offered within 21 days of departure. A 30-day pass bought
 * while planning would therefore expire **before the check it was sold for became
 * available** - which is precisely the "broken promise and a refund" case this
 * codebase already refuses elsewhere. 60 days covers planning plus the check
 * window with room to spare.
 *
 * ## What it is, mechanically
 *
 * Not a new tier. It grants **premium for a fixed window**, which the codebase
 * already supports: `effectivePlan()` has honoured `plan_until` since admin
 * grants existed, so every gate, quota and wallet already behaves correctly for a
 * time-limited premium and none of them needed changing. The pass is, in effect,
 * a grant the customer buys.
 */
import { type Plan, type PaidPlan, planAtLeast, effectivePlan } from './plans';

/** ₪49. Above the ₪29.90 check it contains - that is the whole point; see the header. */
export const TRIP_PASS_PRICE_ILS = 49;

/** 60 days. See "Why 60 days and not 30" in the header - 30 expires before the check unlocks. */
export const TRIP_PASS_DAYS = 60;

/** The `product` value on the `purchases` row. The check uses 'predeparture-check'. */
export const TRIP_PASS_PRODUCT = 'trip-pass';

/**
 * The `profiles.plan_source` value.
 *
 * **Deliberately not 'paypal'**, even though a pass is paid through PayPal, and
 * this is a correctness requirement rather than tidiness: `plan_source === 'paypal'`
 * is the guard that lets the subscription webhook downgrade somebody on CANCELLED,
 * and the one that lets `/api/billing/cancel` act. A pass is a one-off that expires
 * on its own and can never be cancelled. Marking it 'paypal' would expose it to a
 * subscription cancellation it has nothing to do with, and offer the buyer a cancel
 * button that would revoke something they already paid for in full.
 *
 * Needs `sql/supabase-trip-pass.sql` to widen the CHECK constraint on
 * `profiles.plan_source`; until that runs, the grant is rejected by the database.
 */
export const TRIP_PASS_PLAN_SOURCE = 'trip_pass';

/** The price the way people write it - matches `ils()` in plans.ts. */
export const tripPassPriceLabel = () => `${TRIP_PASS_PRICE_ILS.toFixed(2)} ₪`;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The shape this reads out of `profiles` and writes back into it. */
export interface PlanRow {
  plan?: string | null;
  plan_until?: string | null;
  plan_source?: string | null;
}

export interface TripPassGrant {
  plan: PaidPlan;
  /** ISO. Always set - a pass that never expires is a subscription given away. */
  plan_until: string;
  plan_source: typeof TRIP_PASS_PLAN_SOURCE;
}

/**
 * What buying a pass should write, given what the buyer already has.
 *
 * Three rules, each of which is a way this could quietly take something away from
 * somebody who just paid us:
 *
 * 1. **Never demote.** A pro subscriber who buys a pass must stay on pro. Writing
 *    'premium' would downgrade them at the moment they handed over money, and they
 *    would be the one to discover it. Same rule as `grantedPlanFor`.
 *
 * 2. **Extend, never reset.** A buyer with 20 days left who buys a second pass gets
 *    80, not 60. Resetting would silently confiscate the remainder, and it is the
 *    difference between a second purchase being worth making and being a trap.
 *
 * 3. **Never shorten an unlimited plan.** Somebody on an active subscription
 *    (`plan_until` null) already has everything a pass grants. Writing an expiry
 *    onto them would convert an open-ended subscription into one that ends in 60
 *    days - the worst outcome in this function, so it returns null and the caller
 *    must refuse the sale rather than "upgrade" them into something smaller.
 *
 * Returns null when there is nothing to sell.
 */
export function tripPassGrant(row: PlanRow | null | undefined, now: number = Date.now()): TripPassGrant | null {
  const current: Plan = effectivePlan(row, now);

  /*
    Rule 3. An unlimited paid plan - no expiry - is strictly better than a pass.
    Note this reads the RAW plan alongside the effective one on purpose: an expired
    row has a plan_until in the past and must not be mistaken for unlimited.
  */
  const unlimited = planAtLeast(current, 'premium') && !row?.plan_until;
  if (unlimited) return null;

  // Rule 1: keep whatever they have if it already outranks premium.
  const plan: PaidPlan = planAtLeast(current, 'pro') ? 'pro' : 'premium';

  /*
    Rule 2. Extend from the existing expiry when it is still in the future,
    otherwise from now. `effectivePlan` has already decided the row is live, so an
    unparseable date cannot reach here as a live plan - but a corrupt value must
    still not produce an Invalid Date, so it falls back to now.
  */
  const existing = row?.plan_until ? Date.parse(row.plan_until) : NaN;
  const base = Number.isFinite(existing) && existing > now ? existing : now;

  return {
    plan,
    plan_until: new Date(base + TRIP_PASS_DAYS * DAY_MS).toISOString(),
    plan_source: TRIP_PASS_PLAN_SOURCE,
  };
}

/**
 * Whether a pass is worth offering to this account at all.
 *
 * The UI needs this so it can show "you already have everything this gives" rather
 * than taking money for nothing - the same question `tripPassGrant` answers with
 * null, exposed under a name a component can read.
 */
export const tripPassWorthBuying = (row: PlanRow | null | undefined, now: number = Date.now()): boolean =>
  tripPassGrant(row, now) !== null;
