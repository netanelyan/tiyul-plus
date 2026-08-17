import { NextResponse } from 'next/server';
import { resolveCaller } from '@/lib/server/identity';
import { checkLimit } from '@/lib/server/limits';
import { createOrder, paypalConfigured, paypalMode, sandboxBlocked } from '@/lib/server/paypal';
import {
  createPendingPurchase,
  findForUserTrip,
  grantPremiumIncluded,
  setOrderId,
} from '@/lib/server/purchases';
import { findOwnTrip } from '@/lib/server/userTrips';
import { buildPreDepartureReport } from '@/lib/server/predepartureReport';
import { checkOfferEligibility, CURRENCY, PRICE_ILS } from '@/lib/predeparture';
import { todayISO } from '@/lib/trip/dates';

/**
 * POST -> { url } to pay at PayPal, or `{ url: null, included: true }` if it is already
 * included (a premium subscription), or `{ url: null, error }`.
 *
 * Requires a signed-in user - the purchase is tied to an account, not to a browser (an
 * important rule for a tax invoice and for support in six months' time). **The amount
 * never comes from the request body** - the single constant in `lib/predeparture.ts` is
 * what is sent to PayPal, here and only here.
 *
 * ## Premium: no PayPal at all
 *
 * `caller.plan` comes from `resolveCaller`, which reads it from the database using the
 * verified token - **never from the request body**, for exactly the same reason the
 * amount does not come from there. A premium subscriber skips the entire PayPal path
 * (no order, no redirect, no capture/webhook) and gets the report **immediately**:
 * `grantPremiumIncluded` writes a `purchases` row with `status: 'paid'` and
 * `source: 'premium_included'` directly. This is a marginal cost of zero - a
 * deterministic computation against the catalog, not an AI call - so it has no effect
 * whatsoever on the AI budget or on the quotas.
 */
export async function POST(request: Request) {
  const caller = await resolveCaller(request);
  const burst = checkLimit('checks-create-order', caller.id, 5, 10 * 60_000);
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

  // ---------- Shared gates, before splitting into premium/PayPal ----------
  const existing = await findForUserTrip(caller.userId, tripId);
  if (existing?.status === 'paid') {
    return NextResponse.json({ url: null, error: 'already-purchased' });
  }

  const trip = await findOwnTrip(caller.userId, tripId);
  if (!trip) {
    return NextResponse.json({ url: null, error: 'trip-not-found' }, { status: 404 });
  }
  const eligibility = checkOfferEligibility(trip, todayISO());
  if (!eligibility.eligible) {
    return NextResponse.json({ url: null, error: 'not-eligible' }, { status: 400 });
  }

  // ---------- Premium: included, with no PayPal at all ----------
  if (caller.plan === 'premium') {
    const report = buildPreDepartureReport(trip);
    const granted = await grantPremiumIncluded({ userId: caller.userId, tripId, report });
    if (!granted) {
      return NextResponse.json({ url: null, error: 'db-unavailable' }, { status: 503 });
    }
    return NextResponse.json({ url: null, included: true });
  }

  // ---------- Not premium: PayPal ----------
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
    amount: PRICE_ILS,
    currency: CURRENCY,
    mode,
  });
  if (!purchase) {
    return NextResponse.json({ url: null, error: 'db-unavailable' }, { status: 503 });
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? request.headers.get('origin') ?? 'https://tiyulplus.com';
  const returnUrl = `${origin}/chat?trip=${encodeURIComponent(tripId)}&checkReturn=1&purchaseId=${purchase.id}`;
  const cancelUrl = `${origin}/chat?trip=${encodeURIComponent(tripId)}&checkCancel=1&purchaseId=${purchase.id}`;

  const created = await createOrder(mode, {
    purchaseId: purchase.id,
    priceILS: PRICE_ILS,
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
