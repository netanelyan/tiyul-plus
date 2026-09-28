import { NextResponse } from 'next/server';
import { resolveCaller } from '@/lib/server/identity';
import { checkLimit } from '@/lib/server/limits';
import { createOrder, paypalConfigured, paypalMode, sandboxBlocked } from '@/lib/server/paypal';
import { createPendingPurchase, setOrderId } from '@/lib/server/purchases';
import { findOwnTrip } from '@/lib/server/userTrips';
import { tripPassWorthBuying, TRIP_PASS_PRICE_ILS, TRIP_PASS_PRODUCT } from '@/lib/tripPass';
import { adminSelect } from '@/lib/server/supabaseAdmin';
import { tripPassSellable } from '@/lib/server/flags';
import { eq, pgLimit, pgQuery, pgSelect } from '@/lib/server/pgrest';
import type { PlanRow } from '@/lib/tripPass';

const CURRENCY = 'ILS';

/**
 * POST -> start a PayPal order for a trip pass (one trip, everything, 60 days).
 *
 * **This route grants nothing.** It creates a pending `purchases` row and returns
 * PayPal's approval link. Access is written only by the verified webhook, in
 * `processCheckWebhook` - the same separation the pre-departure check already uses,
 * and the reason a caller cannot talk their way into a plan.
 *
 * ## Why this is its own route rather than a `product` parameter on the check's
 *
 * The check's create-order looks superficially reusable and its gates are wrong for
 * a pass in two ways that both matter:
 *
 * - **The 21-day eligibility window.** A check is deliberately only offered close to
 *   departure. A pass is bought *while planning*, which is typically months out, so
 *   `checkOfferEligibility` would refuse nearly every legitimate sale.
 * - **`already-purchased`.** For a check, a second purchase of the same report is a
 *   mistake worth blocking. For a pass it is a renewal, and `tripPassGrant`
 *   deliberately extends the existing window rather than resetting it - so blocking
 *   it would refuse money for no reason.
 *
 * The capture step, by contrast, IS shared: `/api/checks/capture` is already
 * product-agnostic (it finds the purchase by id, verifies ownership, captures, and
 * leaves the row pending for the webhook), so the client uses it for both rather
 * than duplicating a proven path.
 */
export async function POST(request: Request) {
  const caller = await resolveCaller(request);

  /*
    Same shape and numbers as the check's burst limit. Creating an order is cheap for
    us but it does write a row and call PayPal, so it is bounded.
  */
  const burst = checkLimit('pass-create-order', caller.id, 5, 10 * 60_000);
  if (!burst.ok) {
    return NextResponse.json({ url: null, error: 'rate-limited' }, { status: 429 });
  }
  if (!caller.userId) {
    return NextResponse.json({ url: null, error: 'auth-required' }, { status: 401 });
  }

  let body: { tripId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ url: null, error: 'bad-request' }, { status: 400 });
  }
  const tripId = typeof body.tripId === 'string' ? body.tripId.trim().slice(0, 100) : '';
  if (!tripId) return NextResponse.json({ url: null, error: 'bad-request' }, { status: 400 });

  /*
    The pass is bought from a trip, and the trip must be the caller's own -
    `findOwnTrip` filters on user_id AND trip id, which is what stops one account
    attaching a purchase to somebody else's trip. The trip name also goes to PayPal
    as the line item, so it has to be a trip we can actually read.
  */
  const trip = await findOwnTrip(caller.userId, tripId);
  if (!trip) {
    return NextResponse.json({ url: null, error: 'trip-not-found' }, { status: 404 });
  }

  /*
    Refuse to take money for nothing. Somebody on an active unlimited subscription
    already has everything a pass grants, and granting one would write a 60-day
    expiry over an open-ended plan - i.e. make their plan strictly worse. The rule
    lives in `tripPassGrant`; this is the same question asked before charging rather
    than after.
  */
  const rows = await adminSelect<PlanRow>(
    'profiles',
    pgQuery(eq('user_id', caller.userId), pgSelect(['plan', 'plan_until', 'plan_source']), pgLimit(1)),
  );
  if (rows === null) {
    // A failed read must not be mistaken for "no plan" - that would sell a pass to
    // an unlimited subscriber and shorten their plan.
    return NextResponse.json({ url: null, error: 'db-unavailable' }, { status: 503 });
  }
  if (!tripPassWorthBuying(rows[0] ?? null)) {
    return NextResponse.json({ url: null, error: 'already-covered' });
  }

  /*
    **The interlock, before PayPal and before any money moves.**

    The grant writes plan_source = 'trip_pass', which the CHECK constraint on profiles
    rejects until sql/supabase-trip-pass.sql has run - so without the migration a buyer
    would pay and get nothing, and the webhook could only alert about it afterwards.
    The migration sets this flag as its last statement, so "no migration" and "no sale"
    are the same state. See tripPassSellable for why its default is the opposite of the
    agent kill switch's.
  */
  if (!(await tripPassSellable())) {
    console.warn('[pass] refused: trip_pass_ready flag is not set (run sql/supabase-trip-pass.sql)');
    return NextResponse.json({ url: null, error: 'not-configured' });
  }

  const mode = paypalMode();
  if (!paypalConfigured()) {
    return NextResponse.json({ url: null, error: 'not-configured' });
  }
  const host = request.headers.get('host');
  if (sandboxBlocked(host, mode)) {
    return NextResponse.json({ url: null, error: 'sandbox-blocked' }, { status: 503 });
  }

  const purchase = await createPendingPurchase({
    userId: caller.userId,
    tripId,
    amount: TRIP_PASS_PRICE_ILS,
    currency: CURRENCY,
    mode,
    product: TRIP_PASS_PRODUCT,
  });
  if (!purchase) {
    return NextResponse.json({ url: null, error: 'db-unavailable' }, { status: 503 });
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? request.headers.get('origin') ?? 'https://tiyulplus.com';
  const returnUrl = `${origin}/chat?trip=${encodeURIComponent(tripId)}&passReturn=1&purchaseId=${purchase.id}`;
  const cancelUrl = `${origin}/chat?trip=${encodeURIComponent(tripId)}&passCancel=1&purchaseId=${purchase.id}`;

  const created = await createOrder(mode, {
    purchaseId: purchase.id,
    priceILS: TRIP_PASS_PRICE_ILS,
    tripName: trip.name,
    returnUrl,
    cancelUrl,
  });
  if (!created) {
    return NextResponse.json({ url: null, error: 'paypal-failed' });
  }
  await setOrderId(purchase.id, created.orderId);

  return NextResponse.json({ url: created.approveUrl, purchaseId: purchase.id, mode });
}
