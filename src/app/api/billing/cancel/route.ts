import { NextResponse } from 'next/server';
import { paypalConfigured, paypalMode } from '@/lib/server/paypal';
import { cancelSubscriptionAtPaypal, existingSubscription } from '@/lib/server/paypalSubs';
import { resolveCaller } from '@/lib/server/identity';
import { checkLimit } from '@/lib/server/limits';

/**
 * POST → { ok } · **cancelling your own subscription, from your own account
 * screen.**
 *
 * The refunds page has said "cancel at any time" since the subscription
 * existed, and there was nowhere on the site to do it - the real route was
 * PayPal's own dashboard, which the page never mentioned. A recurring charge
 * sold online should be stoppable online, in the same place it was started;
 * that is also what the Consumer Protection Law is driving at for an ongoing
 * transaction.
 *
 * ## What this route does NOT do
 *
 * It does not touch `plan`. PayPal answers the cancel call and then sends
 * BILLING.SUBSCRIPTION.CANCELLED, and the downgrade happens there, in
 * `cancelPaypalPremium`, from a signature-verified event. Writing `plan='free'`
 * here as well would be a second, unverified path to the same state and would
 * diverge the moment PayPal refused the cancellation - the subscriber would
 * lose access while still being billed, which is the worst of both.
 *
 * So the honest thing this can promise is "we asked PayPal to stop the billing
 * and it agreed", and that is what the UI says.
 *
 * ## The subscription id never comes from the request
 *
 * It is read from the caller's own profile row, keyed by the uuid GoTrue
 * returned for their verified token. A body-supplied id would let any signed-in
 * account cancel any subscription whose id they could guess.
 */
export async function POST(request: Request) {
  const caller = await resolveCaller(request);

  if (!checkLimit('billing-cancel', caller.id, 5, 10 * 60_000).ok) {
    return NextResponse.json({ ok: false, error: 'rate-limited' }, { status: 429 });
  }
  if (!caller.userId) {
    return NextResponse.json({ ok: false, error: 'auth-required' }, { status: 401 });
  }
  if (!paypalConfigured()) {
    return NextResponse.json({ ok: false, error: 'not-configured' }, { status: 503 });
  }

  const existing = await existingSubscription(caller.userId);
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'no-subscription' }, { status: 404 });
  }
  /*
    A plan that came from an admin grant or a promo code has no PayPal
    subscription behind it, so there is nothing recurring to stop - and
    cancelling would be a confusing no-op. Same `plan_source` guard
    `cancelPaypalPremium` uses on the way down.
  */
  if (existing.source !== 'paypal') {
    return NextResponse.json({ ok: false, error: 'not-recurring' }, { status: 409 });
  }

  const ok = await cancelSubscriptionAtPaypal(paypalMode(), existing.subscriptionId);
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'paypal-refused' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
