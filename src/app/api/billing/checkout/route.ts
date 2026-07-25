import { NextResponse } from 'next/server';
import { billingConfigured, createCheckoutSession } from '@/lib/server/billing';
import { resolveCaller } from '@/lib/server/identity';
import { checkLimit } from '@/lib/server/limits';

/**
 * POST → { url } של Stripe Checkout, או { url: null, error }.
 * דורש משתמש מחובר (Authorization) - המנוי נקשר לחשבון, לא לדפדפן.
 * בלי מפתחות Stripe: error 'not-configured' והעמוד מציג "בקרוב".
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
  if (!billingConfigured()) {
    return NextResponse.json({ url: null, error: 'not-configured' });
  }
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    request.headers.get('origin') ??
    'https://tiyulplus.com';
  const url = await createCheckoutSession(caller.userId, origin);
  return NextResponse.json(url ? { url } : { url: null, error: 'stripe-failed' });
}
