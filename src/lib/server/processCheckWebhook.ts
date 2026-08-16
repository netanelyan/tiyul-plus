/**
 * לוגיקת ה-webhook של PayPal - **הדרך היחידה שעמודת `status` הופכת
 * ל-`paid`.** נפרד מ-`route.ts` בכוונה: `route.ts` מייבא `next/server`,
 * ומודול שמייבא אותו לא ניתן לטעינה ישירה תחת `node --test` (הרזולוציה
 * של `next/server` דורשת את שרשרת הטעינה המלאה של Next). הפרדת הלוגיקה
 * הטהורה לכאן היא מה שהופך את הזרימה הזאת - כולל האידמפוטנטיות - לניתנת
 * לבדיקה ישירות; `route.ts` נשאר עטיפת `NextResponse` דקה מעליה.
 *
 * חתימה נבדקת מול PayPal (`server/paypal.ts`); בלי חתימה תקפה - 400,
 * בלי לגעת בכלום. עדכון מותנה ב-`purchases.ts` (`WHERE ... AND
 * status='pending'`) הוא מה שהופך webhook כפול ל-no-op - לא בדיקה כאן.
 *
 * אירועים לא מוכרים מקבלים 200 (PayPal שולח עשרות סוגי אירועים).
 */

import { paypalConfigured, paypalMode, verifyWebhookSignature, type WebhookHeaders } from '@/lib/server/paypal';
import { activatePaypalPremium, cancelPaypalPremium } from '@/lib/server/paypalSubs';
import { findByOrderId, findById, markFailed, markPaid } from '@/lib/server/purchases';
import { buildPreDepartureReport } from '@/lib/server/predepartureReport';
import { findOwnTrip } from '@/lib/server/userTrips';
import { postAlert } from '@/lib/server/alert';
import type { PreDepartureReport } from '@/lib/predeparture';

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

export interface WebhookResult {
  status: number;
  body: Record<string, unknown>;
}

const ok = (body: Record<string, unknown>): WebhookResult => ({ status: 200, body });

export async function processCheckWebhook(rawBody: string, headers: WebhookHeaders): Promise<WebhookResult> {
  const mode = paypalMode();
  if (!paypalConfigured()) {
    return { status: 503, body: { error: 'not-configured' } };
  }

  const valid = await verifyWebhookSignature(mode, headers, rawBody);
  if (!valid) {
    console.warn('[checks webhook] bad signature');
    return { status: 400, body: { error: 'bad-signature' } };
  }

  let event: PaypalEvent;
  try {
    event = JSON.parse(rawBody) as PaypalEvent;
  } catch {
    return { status: 400, body: { error: 'bad-json' } };
  }

  /*
    מנוי הפרימיום עובר באותו webhook מאומת (האפליקציה רשומה על All
    Events): ACTIVATED מדליק, ביטול/השעיה/פקיעה מכבים - עם השמירה
    ש-cancelPaypalPremium מוריד רק פרימיום שמקורו PayPal, כדי שביטול
    מנוי ישן לא ימחק הענקת אדמין. custom_id הוא ה-uuid שאנחנו קבענו
    ביצירת המנוי, והאירוע חתום - זו לא זהות שהלקוח יכול לזייף.
  */
  const subUserId = event.resource?.custom_id;
  if (event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED' && subUserId) {
    const subId = (event.resource as { id?: string } | undefined)?.id ?? '';
    const done = await activatePaypalPremium(subUserId, subId);
    if (!done) console.warn('[checks webhook] premium activation failed', { subUserId });
    return ok({ received: true, premium: done });
  }
  if (
    (event.event_type === 'BILLING.SUBSCRIPTION.CANCELLED' ||
      event.event_type === 'BILLING.SUBSCRIPTION.SUSPENDED' ||
      event.event_type === 'BILLING.SUBSCRIPTION.EXPIRED') &&
    subUserId
  ) {
    const done = await cancelPaypalPremium(subUserId);
    return ok({ received: true, downgraded: done });
  }

  if (event.event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
    return ok({ received: true });
  }

  const resource = event.resource ?? {};
  const orderId = resource.supplementary_data?.related_ids?.order_id;
  const captureId = resource.id;
  const amountValue = resource.amount?.value;
  const currencyCode = resource.amount?.currency_code;

  if (!captureId || !amountValue || !currencyCode || resource.status !== 'COMPLETED') {
    console.warn('[checks webhook] malformed capture resource', { orderId, captureId });
    return ok({ received: true, reason: 'malformed' });
  }

  // מזהה ההזמנה קודם; custom_id (=מזהה הרכישה שלנו) הוא גיבוי אם הראשון חסר
  const purchase = orderId
    ? await findByOrderId(orderId)
    : resource.custom_id
      ? await findById(resource.custom_id)
      : null;

  if (!purchase) {
    console.warn('[checks webhook] no matching purchase', { orderId, customId: resource.custom_id });
    return ok({ received: true, reason: 'no-match' });
  }
  if (purchase.status !== 'pending') {
    // כבר paid (webhook כפול) או failed/revoked - no-op מכוון, לא שגיאה
    return ok({ received: true, alreadyProcessed: true });
  }
  const realOrderId = purchase.paypal_order_id;
  if (!realOrderId) {
    return ok({ received: true, reason: 'no-order-id' });
  }

  // הסכום נקבע אצלנו בזמן יצירת ההזמנה - זה מה שמוודא שאף אחד לא שילם פחות
  const amountOk = Number(amountValue) === Number(purchase.amount) && currencyCode === purchase.currency;
  if (!amountOk) {
    await markFailed(
      realOrderId,
      `amount mismatch: expected ${purchase.amount} ${purchase.currency}, got ${amountValue} ${currencyCode}`,
      event,
    );
    postAlert(
      `⚠️ טיול+ · אי-התאמת סכום ברכישה ${purchase.id} (הזמנת PayPal ${realOrderId}): ציפינו ל-${purchase.amount} ${purchase.currency}, קיבלנו ${amountValue} ${currencyCode}. לא הוענקה גישה. לבדוק ידנית.`,
    );
    return ok({ received: true, reason: 'amount-mismatch' });
  }

  const trip = await findOwnTrip(purchase.user_id, purchase.trip_id);
  const report: PreDepartureReport = trip
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

  return ok({ received: true, ok: Boolean(updated) });
}
