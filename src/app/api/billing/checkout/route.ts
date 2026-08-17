import { NextResponse } from 'next/server';
import { billingConfigured, createCheckoutSession } from '@/lib/server/billing';
import { paypalConfigured, paypalMode, sandboxBlocked } from '@/lib/server/paypal';
import { createSubscription } from '@/lib/server/paypalSubs';
import { resolveCaller } from '@/lib/server/identity';
import { checkLimit } from '@/lib/server/limits';

/**
 * POST → { url } for subscription approval, or { url: null, error }.
 * Requires a signed-in user (Authorization) - the subscription is tied to the
 * account, not to the browser.
 *
 * **PayPal first, Stripe as legacy.** PayPal is the processor already running
 * real money on the site (the pre-departure check); Stripe was never wired up.
 * The PayPal path creates a Subscription with custom_id = the user's verified
 * uuid - the activation itself happens only in the webhook
 * (BILLING.SUBSCRIPTION.ACTIVATED), not here. Same sandbox-on-the-live-domain
 * guard as in the one-time purchase.
 */
export async function POST(request: Request) {
  const caller = await resolveCaller(request);
  const burst = checkLimit('billing-checkout', caller.id, 5, 10 * 60_000);
  if (!burst.ok) {
    return NextResponse.json({ url: null, error: 'rate-limited' }, { status: 429 });
  }
  if (!caller.userId) {
    return NextResponse.json({ url: null, error: 'auth-required' }, { status: 401 });
  }
  if (caller.plan === 'premium') {
    return NextResponse.json({ url: null, error: 'already-premium' });
  }
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    request.headers.get('origin') ??
    'https://tiyulplus.com';

  if (paypalConfigured()) {
    const mode = paypalMode();
    if (sandboxBlocked(request.headers.get('host'), mode)) {
      return NextResponse.json({ url: null, error: 'sandbox-blocked' }, { status: 503 });
    }
    const sub = await createSubscription(mode, {
      userId: caller.userId,
      returnUrl: `${origin}/account?subReturn=1`,
      cancelUrl: `${origin}/premium?subCancel=1`,
    });
    return NextResponse.json(sub ? { url: sub.approveUrl, mode } : { url: null, error: 'paypal-failed' });
  }

  if (!billingConfigured()) {
    return NextResponse.json({ url: null, error: 'not-configured' });
  }
  const url = await createCheckoutSession(caller.userId, origin);
  return NextResponse.json(url ? { url } : { url: null, error: 'stripe-failed' });
}
