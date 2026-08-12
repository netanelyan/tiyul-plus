import { NextResponse } from 'next/server';
import { paypalConfigured, paypalMode, verifyWebhookSignature, type WebhookHeaders } from '@/lib/server/paypal';
import { findByOrderId, findById, markFailed, markPaid } from '@/lib/server/purchases';
import { buildPreDepartureReport } from '@/lib/server/predepartureReport';
import { findOwnTrip } from '@/lib/server/userTrips';
import { postAlert } from '@/lib/server/alert';

/**
 * ה-webhook של PayPal - **הדרך היחידה שעמודת `status` הופכת ל-`paid`.**
 *
 * חתימה נבדקת מול PayPal (`server/paypal.ts`); בלי חתימה תקפה - 400,
 * בלי לגעת בכלום. עדכון מותנה ב-`purchases.ts` (`WHERE ... AND
 * status='pending'`) הוא מה שהופך webhook כפול ל-no-op - לא בדיקה כאן.
 *
 * אירועים לא מוכרים מקבלים 200 (PayPal שולח עשרות סוגי אירועים).
 */

interface PaypalCapture {
  id?: string;
  status?: string;
  amount?: { value?: string; currency_code?: string };
  custom_id?: string;
  supplementary_data?: { related_ids?: { order_id?: string } };
}

interface PaypalEvent {
  event_type?: string;
  resource?: PaypalCapture;
}

function headersFrom(req: Request): WebhookHeaders {
  return {
    authAlgo: req.headers.get('paypal-auth-algo'),
    certUrl: req.headers.get('paypal-cert-url'),
    transmissionId: req.headers.get('paypal-transmission-id'),
    transmissionSig: req.headers.get('paypal-transmission-sig'),
    transmissionTime: req.headers.get('paypal-transmission-time'),
  };
}

export async function POST(request: Request) {
  const mode = paypalMode();
  if (!paypalConfigured()) {
    return NextResponse.json({ error: 'not-configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  const valid = await verifyWebhookSignature(mode, headersFrom(request), rawBody);
  if (!valid) {
    console.warn('[checks webhook] bad signature');
    return NextResponse.json({ error: 'bad-signature' }, { status: 400 });
  }

  let event: PaypalEvent;
  try {
    event = JSON.parse(rawBody) as PaypalEvent;
  } catch {
    return NextResponse.json({ error: 'bad-json' }, { status: 400 });
  }

  if (event.event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
    return NextResponse.json({ received: true });
  }

  const resource = event.resource ?? {};
  const orderId = resource.supplementary_data?.related_ids?.order_id;
  const captureId = resource.id;
  const amountValue = resource.amount?.value;
  const currencyCode = resource.amount?.currency_code;

  if (!captureId || !amountValue || !currencyCode || resource.status !== 'COMPLETED') {
    console.warn('[checks webhook] malformed capture resource', { orderId, captureId });
    return NextResponse.json({ received: true, reason: 'malformed' });
  }

  // מזהה ההזמנה קודם; custom_id (=מזהה הרכישה שלנו) הוא גיבוי אם הראשון חסר
  const purchase = orderId
    ? await findByOrderId(orderId)
    : resource.custom_id
      ? await findById(resource.custom_id)
      : null;

  if (!purchase) {
    console.warn('[checks webhook] no matching purchase', { orderId, customId: resource.custom_id });
    return NextResponse.json({ received: true, reason: 'no-match' });
  }
  if (purchase.status !== 'pending') {
    // כבר paid (webhook כפול) או failed/revoked - no-op מכוון, לא שגיאה
    return NextResponse.json({ received: true, alreadyProcessed: true });
  }
  const realOrderId = purchase.paypal_order_id;
  if (!realOrderId) {
    return NextResponse.json({ received: true, reason: 'no-order-id' });
  }

  // הסכום נקבע אצלנו בזמן יצירת ההזמנה - זה מה שמוודא שאף אחד לא שילם פחות
  const amountOk = Number(amountValue) === Number(purchase.amount) && currencyCode === purchase.currency;
  if (!amountOk) {
    await markFailed(realOrderId, `amount mismatch: expected ${purchase.amount} ${purchase.currency}, got ${amountValue} ${currencyCode}`, event);
    postAlert(
      `⚠️ טיול+ · אי-התאמת סכום ברכישה ${purchase.id} (הזמנת PayPal ${realOrderId}): ציפינו ל-${purchase.amount} ${purchase.currency}, קיבלנו ${amountValue} ${currencyCode}. לא הוענקה גישה. לבדוק ידנית.`,
    );
    return NextResponse.json({ received: true, reason: 'amount-mismatch' });
  }

  const trip = await findOwnTrip(purchase.user_id, purchase.trip_id);
  const report = trip
    ? buildPreDepartureReport(trip)
    : {
        generatedAt: new Date().toISOString(),
        tripName: '(הטיול לא נמצא)',
        placesChecked: 0,
        placesFlagged: [],
        kosherChecked: 0,
        kosherNotes: [],
        calendarFindings: [],
        routeOk: true,
        itinerary: [],
      };

  if (!trip) {
    // שילמו וקיבלנו את הכסף, אבל אין לנו על מה לבנות דוח - זה בדיוק
    // המצב שנתנאל ביקש לדעת עליו מיד.
    postAlert(
      `🚨 טיול+ · רכישה ${purchase.id} שולמה אבל הטיול (${purchase.trip_id}, משתמש ${purchase.user_id}) לא נמצא ב-user_trips. הגישה ניתנה בלי דוח תקין - לבדוק ידנית.`,
    );
  }

  const updated = await markPaid(realOrderId, {
    captureId,
    payerEmail: null,
    report,
    rawWebhook: event,
  });
  if (!updated) {
    // הפסדנו מרוץ מול webhook כפול שהגיע כמעט באותו רגע - no-op תקין
    console.warn('[checks webhook] markPaid affected 0 rows (already processed)', { realOrderId });
  }

  return NextResponse.json({ received: true, ok: Boolean(updated) });
}
