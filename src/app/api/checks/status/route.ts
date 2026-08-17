import { NextResponse } from 'next/server';
import { resolveCaller } from '@/lib/server/identity';
import { checkLimit } from '@/lib/server/limits';
import { findForUserTrip } from '@/lib/server/purchases';
import { postAlert } from '@/lib/server/alert';

/**
 * GET -> the purchase state for a trip, for polling after returning from PayPal and for the
 * "already purchased - you see a result, not an offer" display.
 *
 * **Also the visibility mechanism for "stuck":** if more than 3 minutes have passed and it
 * is still `pending`, that is exactly the moment the traveller is sitting there waiting - the
 * alert goes out here, once per purchase, and does not wait for somebody to open /admin. That
 * 3-minute rule complements rather than replaces the admin card: a traveller who closed the
 * tab before polling will not trigger it, and then /admin (which flags purchases stuck for
 * more than 15 minutes on every load) is the second net.
 */

const POLL_ALERT_AFTER_MS = 3 * 60_000;
const alertedPurchases = new Set<string>();

export async function GET(request: Request) {
  const caller = await resolveCaller(request);
  const burst = checkLimit('checks-status', caller.id, 60, 60_000);
  if (!burst.ok) return NextResponse.json({ status: 'none' }, { status: 429 });
  if (!caller.userId) return NextResponse.json({ status: 'none', error: 'auth-required' }, { status: 401 });

  const url = new URL(request.url);
  const tripId = (url.searchParams.get('tripId') ?? '').slice(0, 100);
  if (!tripId) return NextResponse.json({ status: 'none' }, { status: 400 });

  const purchase = await findForUserTrip(caller.userId, tripId);
  if (!purchase) return NextResponse.json({ status: 'none' });

  if (purchase.status === 'paid') {
    return NextResponse.json({ status: 'paid', report: purchase.report, paidAt: purchase.paid_at });
  }
  if (purchase.status === 'pending') {
    const ageMs = Date.now() - Date.parse(purchase.created_at);
    if (Number.isFinite(ageMs) && ageMs > POLL_ALERT_AFTER_MS && !alertedPurchases.has(purchase.id)) {
      alertedPurchases.add(purchase.id);
      if (alertedPurchases.size > 5000) alertedPurchases.clear();
      postAlert(
        `⏳ טיול+ · רכישה ${purchase.id} עדיין pending אחרי ${Math.round(ageMs / 60_000)} דקות (טיול ${purchase.trip_id}). ייתכן שה-webhook התעכב או לא הגיע.`,
      );
    }
    return NextResponse.json({ status: 'pending' });
  }
  // failed / revoked - from the client's point of view this is like "not purchased", it can be offered again
  return NextResponse.json({ status: 'none' });
}
