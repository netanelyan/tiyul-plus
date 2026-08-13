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
 * POST → { url } לתשלום ב-PayPal, או `{ url: null, included: true }` אם
 * זה כבר כלול (מנוי פרימיום), או `{ url: null, error }`.
 *
 * דורש משתמש מחובר - הרכישה קשורה לחשבון, לא לדפדפן (חוק חשוב לחשבונית
 * מס ולתמיכה בעוד חצי שנה). **הסכום לעולם לא מגיע מגוף הבקשה** - הקבוע
 * היחיד ב-`lib/predeparture.ts` הוא מה שנשלח ל-PayPal, כאן ורק כאן.
 *
 * ## פרימיום: אין PayPal בכלל
 *
 * `caller.plan` מגיע מ-`resolveCaller`, שקורא אותו מהדאטהבייס לפי הטוקן
 * המאומת - **לעולם לא מגוף הבקשה**, מאותה סיבה בדיוק שהסכום לא מגיע
 * משם. מנוי פרימיום מדלג על כל מסלול ה-PayPal (אין order, אין redirect,
 * אין capture/webhook) ומקבל את הדוח **מייד**: `grantPremiumIncluded`
 * כותב שורת `purchases` עם `status: 'paid'` ו-`source: 'premium_included'`
 * ישירות. זו עלות שולית של אפס - חישוב דטרמיניסטי מול הקטלוג, לא
 * קריאת AI - ולכן אין לזה שום השפעה על תקציב ה-AI או על המכסות.
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

  // ---------- שערים משותפים, לפני שמפצלים לפרימיום/PayPal ----------
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

  // ---------- פרימיום: כלול, בלי PayPal בכלל ----------
  if (caller.plan === 'premium') {
    const report = buildPreDepartureReport(trip);
    const granted = await grantPremiumIncluded({ userId: caller.userId, tripId, report });
    if (!granted) {
      return NextResponse.json({ url: null, error: 'db-unavailable' }, { status: 503 });
    }
    return NextResponse.json({ url: null, included: true });
  }

  // ---------- לא-פרימיום: PayPal ----------
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
