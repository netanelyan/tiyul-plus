import { NextResponse } from 'next/server';
import { billingConfigured, createCheckoutSession } from '@/lib/server/billing';
import { paypalConfigured, paypalMode, sandboxBlocked } from '@/lib/server/paypal';
import { createSubscription, existingSubscription, reviseSubscription } from '@/lib/server/paypalSubs';
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
 *
 * **A caller who already subscribes is REVISED, not sold a second
 * subscription** - see the block below. That path grants nothing either; the
 * change lands only on the verified BILLING.SUBSCRIPTION.UPDATED webhook, and
 * there the new plan is read from `plan_id` rather than from custom_id, which
 * still names the plan they originally bought.
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
    **Already on a paid plan and moving to a dearer one: revise, never sell a
    second subscription.**

    Creating a second PayPal subscription does not replace the first - it runs
    alongside it and the subscriber is billed twice, discovered by the customer
    on the one path where they were actively trying to give us more money.
    `revise` changes the plan on the subscription that already exists, so there
    is only ever one.

    Three ways this legitimately cannot proceed, and each falls back to the
    manual path rather than to a second subscription:
      - the current plan did not come from PayPal (an admin grant or a promo
        code has no subscription to revise);
      - we hold no subscription id for them;
      - PayPal declines the revise, or returns no approval link.

    **Downgrades are deliberately not offered here.** `revise` can do them, but
    the money question - proration, a credit, a refund for the remainder - is
    one I cannot answer or test from here, and getting it wrong takes money
    from somebody. A downgrade stays manual until that is decided.
  */
  const switching = planAtLeast(caller.plan, 'premium');
  const existing = switching ? await existingSubscription(caller.userId) : null;
  if (switching && (!existing || existing.source !== 'paypal')) {
    return NextResponse.json({ url: null, error: 'switch-requires-support' });
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    request.headers.get('origin') ??
    'https://tiyulplus.com';
  const returnUrl = `${origin}/account?subReturn=1`;
  const cancelUrl = `${origin}/premium?subCancel=1`;

  if (paypalConfigured()) {
    const mode = paypalMode();
    if (sandboxBlocked(request.headers.get('host'), mode)) {
      return NextResponse.json({ url: null, error: 'sandbox-blocked' }, { status: 503 });
    }

    if (existing) {
      const revised = await reviseSubscription(mode, {
        subscriptionId: existing.subscriptionId,
        plan: wanted,
        returnUrl,
        cancelUrl,
      });
      /*
        A failed revise falls back to the manual path and NOT to
        createSubscription - the fallback that looks helpful is exactly the
        double charge this branch exists to prevent.
      */
      return NextResponse.json(
        revised
          ? { url: revised.approveUrl, mode, switched: true }
          : { url: null, error: 'switch-requires-support' },
      );
    }

    const sub = await createSubscription(mode, {
      userId: caller.userId,
      plan: wanted,
      returnUrl,
      cancelUrl,
    });
    return NextResponse.json(sub ? { url: sub.approveUrl, mode } : { url: null, error: 'paypal-failed' });
  }

  if (!billingConfigured()) {
    return NextResponse.json({ url: null, error: 'not-configured' });
  }
  // The legacy Stripe path never handled plan switching and never will - it has
  // no subscription of ours to revise.
  if (switching) {
    return NextResponse.json({ url: null, error: 'switch-requires-support' });
  }
  const url = await createCheckoutSession(caller.userId, origin);
  return NextResponse.json(url ? { url } : { url: null, error: 'stripe-failed' });
}
