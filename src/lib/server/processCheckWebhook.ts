/**
 * The PayPal webhook logic - **the only way the `status` column ever becomes
 * `paid`.** Separated from `route.ts` on purpose: `route.ts` imports
 * `next/server`, and a module that imports it cannot be loaded directly under
 * `node --test` (resolving `next/server` requires Next's full loading chain).
 * Splitting the pure logic out here is what makes this flow - including the
 * idempotency - directly testable; `route.ts` stays a thin `NextResponse`
 * wrapper on top of it.
 *
 * The signature is verified against PayPal (`server/paypal.ts`); without a valid
 * signature - 400, without touching anything. The conditional update in
 * `purchases.ts` (`WHERE ... AND status='pending'`) is what turns a duplicate
 * webhook into a no-op - not a check here.
 *
 * Unrecognized events get 200 (PayPal sends dozens of event types).
 */

import { paypalConfigured, paypalMode, verifyWebhookSignature, type WebhookHeaders } from '@/lib/server/paypal';
import {
  activatePaypalPremium,
  cancelPaypalPremium,
  parseSubscriptionCustomId,
  planIdToPlan,
} from '@/lib/server/paypalSubs';
import { findByOrderId, findById, markFailed, markPaid } from '@/lib/server/purchases';
import { buildPreDepartureReport } from '@/lib/server/predepartureReport';
import { findOwnTrip } from '@/lib/server/userTrips';
import { postAlert } from '@/lib/server/alert';
import type { PreDepartureReport } from '@/lib/predeparture';

interface PaypalCapture {
  id?: string;
  /** Subscription events only: which billing plan the subscription is on NOW */
  plan_id?: string;
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
    The premium subscription goes through the same verified webhook (the app is
    registered for All Events): ACTIVATED turns it on, cancellation/suspension/
    expiry turn it off - with the safeguard that cancelPaypalPremium downgrades
    only premium whose source is PayPal, so cancelling an old subscription never
    erases an admin grant. custom_id is the uuid WE set when creating the
    subscription, and the event is signed - this is not an identity the client
    can forge.
  */
  const subUserId = event.resource?.custom_id;
  /*
    custom_id carries the tier as well since the pro plan was added
    (`<uuid>|pro`), so the same signed event says both who and what. A bare
    uuid - every subscription created before that - parses as premium.
  */
  const sub = subUserId ? parseSubscriptionCustomId(subUserId) : null;

  if (
    (event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED' ||
      event.event_type === 'BILLING.SUBSCRIPTION.UPDATED') &&
    sub
  ) {
    const subResource = event.resource;
    const subId = subResource?.id ?? '';

    /*
      **Which plan, and why plan_id comes first.**

      custom_id is fixed at creation and PayPal echoes it forever, so after a
      premium subscriber revises UP to pro it still says premium. Trusting it on
      an UPDATED event would demote the person on the very webhook confirming
      they now pay more. `plan_id` is the only field that reflects the change.

      The fallback to custom_id covers a subscription created before the pro
      plan existed, or an app_flags read that failed. It resolves to premium,
      which is the **cheaper** plan - so a failed lookup under-grants (visible,
      they tell us) rather than over-grants (invisible, we pay).

      An UPDATED event carrying a plan we cannot identify changes nothing at
      all: on this path "I do not know" must never mean "assume the old value
      is still right", because the event exists precisely because it changed.
    */
    const fromPlanId = subResource?.plan_id ? await planIdToPlan(mode, subResource.plan_id) : null;
    if (event.event_type === 'BILLING.SUBSCRIPTION.UPDATED' && !fromPlanId) {
      console.warn('[checks webhook] subscription updated with an unknown plan_id - ignored', {
        planId: subResource?.plan_id,
      });
      return ok({ received: true, premium: false, reason: 'unknown-plan' });
    }
    const plan = fromPlanId ?? sub.plan;

    const done = await activatePaypalPremium(sub.userId, subId, plan);
    if (!done) console.warn('[checks webhook] premium activation failed', { userId: sub.userId });
    return ok({ received: true, premium: done, plan });
  }
  if (
    (event.event_type === 'BILLING.SUBSCRIPTION.CANCELLED' ||
      event.event_type === 'BILLING.SUBSCRIPTION.SUSPENDED' ||
      event.event_type === 'BILLING.SUBSCRIPTION.EXPIRED') &&
    sub
  ) {
    const done = await cancelPaypalPremium(sub.userId);
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

  // The order id comes first; custom_id (= our purchase id) is a fallback if the first is missing
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
    // Already paid (duplicate webhook) or failed/revoked - a deliberate no-op, not an error
    return ok({ received: true, alreadyProcessed: true });
  }
  const realOrderId = purchase.paypal_order_id;
  if (!realOrderId) {
    return ok({ received: true, reason: 'no-order-id' });
  }

  // The amount is set on our side when the order is created - this is what ensures nobody paid less
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
    // They paid and we received the money, but we have nothing to build a report
    // from - this is exactly the situation Netanel asked to know about immediately.
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
    // We lost a race against a duplicate webhook that arrived at almost the same moment - a valid no-op
    console.warn('[checks webhook] markPaid affected 0 rows (already processed)', { realOrderId });
  }

  return ok({ received: true, ok: Boolean(updated) });
}
