import { NextResponse } from 'next/server';
import {
  findUserByStripeCustomer,
  setUserPlan,
  verifyStripeSignature,
} from '@/lib/server/billing';
import { invalidatePlanCache } from '@/lib/server/identity';

/**
 * ה-webhook של Stripe - הדרך היחידה שעמודת plan משתנה.
 *
 * checkout.session.completed  → plan='premium' (+ שמירת customer id)
 * customer.subscription.deleted / updated עם סטטוס לא-פעיל → plan='free'
 *
 * החתימה מאומתת ידנית מול STRIPE_WEBHOOK_SECRET; בלי חתימה תקפה - 400,
 * בלי לגעת בכלום. אירועים לא מוכרים מקבלים 200 (Stripe שולח עשרות סוגים).
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

  // אירוע שלא מטופל - מאשרים כדי ש-Stripe לא ינסה שוב לנצח
  return NextResponse.json({ received: true });
}
