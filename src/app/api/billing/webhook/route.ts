import { NextResponse } from 'next/server';
import {
  findUserByStripeCustomer,
  setUserPlan,
  verifyStripeSignature,
} from '@/lib/server/billing';
import { invalidatePlanCache } from '@/lib/server/identity';

/**
 * Stripe's webhook - the only way the plan column changes.
 *
 * checkout.session.completed  -> plan='premium' (+ storing the customer id)
 * customer.subscription.deleted / updated with an inactive status -> plan='free'
 *
 * The signature is verified manually against STRIPE_WEBHOOK_SECRET; with no valid signature -
 * 400, and nothing is touched. Unrecognised events get a 200 (Stripe sends dozens of kinds).
 */

interface StripeEvent {
  type?: string;
  data?: {
    object?: {
      client_reference_id?: string | null;
      customer?: string | null;
      status?: string;
      metadata?: { user_id?: string };
    };
  };
}

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'not-configured' }, { status: 503 });

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!verifyStripeSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'bad-signature' }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ error: 'bad-json' }, { status: 400 });
  }

  const obj = event.data?.object ?? {};

  if (event.type === 'checkout.session.completed') {
    const userId = obj.client_reference_id ?? obj.metadata?.user_id ?? null;
    if (userId) {
      const ok = await setUserPlan(userId, 'premium', obj.customer ?? undefined);
      if (ok) invalidatePlanCache(userId);
      return NextResponse.json({ ok });
    }
    return NextResponse.json({ ok: false, reason: 'no-user' });
  }

  if (
    event.type === 'customer.subscription.deleted' ||
    (event.type === 'customer.subscription.updated' &&
      obj.status !== undefined &&
      !ACTIVE_STATUSES.has(obj.status))
  ) {
    const userId =
      obj.metadata?.user_id ??
      (obj.customer ? await findUserByStripeCustomer(obj.customer) : null);
    if (userId) {
      const ok = await setUserPlan(userId, 'free');
      if (ok) invalidatePlanCache(userId);
      return NextResponse.json({ ok });
    }
    return NextResponse.json({ ok: false, reason: 'no-user' });
  }

  // An event we do not handle - acknowledge it so Stripe does not retry forever
  return NextResponse.json({ received: true });
}
