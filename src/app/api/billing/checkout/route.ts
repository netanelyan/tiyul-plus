import { NextResponse } from 'next/server';
import { billingConfigured, createCheckoutSession } from '@/lib/server/billing';
import { paypalConfigured, paypalMode, sandboxBlocked } from '@/lib/server/paypal';
import { createSubscription } from '@/lib/server/paypalSubs';
import { resolveCaller } from '@/lib/server/identity';
import { checkLimit } from '@/lib/server/limits';
import { planAtLeast, type PaidPlan } from '@/lib/plans';

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
  /*
    Which plan is being bought. **Validated against a closed list, never used
    as a price** - the amount is built server-side from the constant for that
    plan (see paypalSubs.ts), so the worst a forged body can do is buy the
    wrong one of two plans at that plan's real price. An unrecognised or
    missing value falls back to premium, which is both the cheaper plan and the
    behaviour every existing client already relies on.
  */
  let wanted: PaidPlan = 'premium';
  try {
    const body = (await request.json()) as { plan?: unknown };
    if (body?.plan === 'pro') wanted = 'pro';
  } catch {
    /* No body at all is the old client, and it means premium */
  }
  const burst = checkLimit('billing-checkout', caller.id, 5, 10 * 60_000);
  if (!burst.ok) {
    return NextResponse.json({ url: null, error: 'rate-limited' }, { status: 429 });
  }
  if (!caller.userId) {
    return NextResponse.json({ url: null, error: 'auth-required' }, { status: 401 });
  }
  // Already has at least what they are asking for - nothing to sell them.
  if (planAtLeast(caller.plan, wanted)) {
    return NextResponse.json({ url: null, error: 'already-premium' });
  }
  /*
    **Upgrading from one paid plan to another is refused here, deliberately.**

    Creating a second PayPal subscription does not replace the first one - it
    runs alongside it, and the subscriber is charged for both until somebody
    notices. That is a real double charge, caused by us, on the one path where
    a customer is actively trying to give us more money.

    Doing it properly means PayPal's `revise` flow on the existing subscription
    id (which we do store), and that is a separate integration that cannot be
    verified from here. Until it exists, the honest answer is to say so and
    handle the switch by hand rather than to sell a second subscription and let
    the traveller discover the duplicate on their statement.
  */
  if (planAtLeast(caller.plan, 'premium')) {
    return NextResponse.json({ url: null, error: 'switch-requires-support' });
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
      plan: wanted,
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
