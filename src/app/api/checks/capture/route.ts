import { NextResponse } from 'next/server';
import { resolveCaller } from '@/lib/server/identity';
import { checkLimit } from '@/lib/server/limits';
import { captureOrder } from '@/lib/server/paypal';
import { findById, markFailed } from '@/lib/server/purchases';

/**
 * POST -> triggers the capture against PayPal after the traveller approved it there. **This
 * is not the place that grants access** - see the header of `server/paypal.ts`. A successful
 * capture only guarantees that the money moved; what sets `status='paid'` is the verified
 * webhook in `/api/checks/webhook`, and only that. The return page calls this and then moves
 * to a "verifying" state, not to a "paid" state.
 */
export async function POST(request: Request) {
  const caller = await resolveCaller(request);
  const burst = checkLimit('checks-capture', caller.id, 10, 10 * 60_000);
  if (!burst.ok) return NextResponse.json({ ok: false, error: 'rate-limited' }, { status: 429 });
  if (!caller.userId) return NextResponse.json({ ok: false, error: 'auth-required' }, { status: 401 });

  let body: { purchaseId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'bad-request' }, { status: 400 });
  }
  const purchaseId = typeof body.purchaseId === 'string' ? body.purchaseId : '';
  if (!purchaseId) return NextResponse.json({ ok: false, error: 'bad-request' }, { status: 400 });

  const purchase = await findById(purchaseId);
  // Ownership: nobody can make their own payment capture on somebody else's behalf
  if (!purchase || purchase.user_id !== caller.userId) {
    return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
  }
  if (purchase.status === 'paid') {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }
  if (purchase.status !== 'pending' || !purchase.paypal_order_id) {
    return NextResponse.json({ ok: false, error: 'not-pending' }, { status: 409 });
  }

  const outcome = await captureOrder(purchase.mode, purchase.paypal_order_id);
  if (outcome.ok) {
    // The status deliberately stays pending. The client moves on to poll /api/checks/status.
    return NextResponse.json({ ok: true, captured: true });
  }

  if (outcome.reason === 'declined') {
    await markFailed(purchase.paypal_order_id, 'paypal capture declined');
    return NextResponse.json({ ok: false, error: 'declined' });
  }
  // 'network' / 'not-configured' / 'bad-response': transient, the row is untouched - it can be retried
  return NextResponse.json({ ok: false, error: 'retry' }, { status: 503 });
}
