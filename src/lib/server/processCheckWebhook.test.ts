/**
 * The webhook logic, end to end against a PayPal mock + a Supabase mock - not just the
 * functions beneath it. **The claim these tests exist to prove: a duplicate webhook is not
 * a duplicate grant, and an invalid signature or a wrong amount grants nothing.** The
 * `purchases` mock actually emulates the `WHERE status='pending'` discussed in
 * `purchases.ts` - it checks that itself, rather than merely "returning what was asked
 * for".
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { WebhookHeaders } from './paypal.ts';

const ENV = [
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
  'PAYPAL_MODE', 'PAYPAL_API_BASE', 'PAYPAL_CLIENT_ID_SANDBOX', 'PAYPAL_CLIENT_SECRET_SANDBOX', 'PAYPAL_WEBHOOK_ID_SANDBOX',
] as const;
const saved: Record<string, string | undefined> = {};
const realFetch = globalThis.fetch;

interface DbPurchase {
  id: string;
  user_id: string;
  trip_id: string;
  amount: number;
  currency: string;
  status: string;
  source: string;
  mode: string;
  paypal_order_id: string;
  paypal_capture_id: string | null;
  report?: unknown;
}

let purchase: DbPurchase;
let trip: unknown;
let verifySignature: boolean;
/** A profiles row for the mock - the subscription events read from and write to it */
let profile: { user_id: string; plan: string; plan_source: string | null } | null;

beforeEach(() => {
  for (const k of ENV) saved[k] = process.env[k];
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_service';
  process.env.PAYPAL_API_BASE = 'https://mock.paypal.test';
  process.env.PAYPAL_CLIENT_ID_SANDBOX = 'c';
  process.env.PAYPAL_CLIENT_SECRET_SANDBOX = 's';
  process.env.PAYPAL_WEBHOOK_ID_SANDBOX = 'wh';
  delete process.env.PAYPAL_MODE;

  verifySignature = true;
  profile = null;
  purchase = {
    id: 'purch-1',
    user_id: 'user-1',
    trip_id: 'trip-1',
    amount: 29.9,
    currency: 'ILS',
    status: 'pending',
    source: 'paypal',
    mode: 'sandbox',
    paypal_order_id: 'ORDER1',
    paypal_capture_id: null,
  };
  trip = {
    id: 'trip-1',
    name: 'טיול בדיקה',
    citySlugs: ['vienna'],
    createdAt: Date.now(),
    startDate: '2026-09-01',
    days: [{ id: 'd1', citySlug: 'vienna', placeIds: ['vie-schonbrunn'] }],
  };

  globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    if (url.includes('/oauth2/token')) {
      return new Response(JSON.stringify({ access_token: 'T', expires_in: 3600 }), { status: 200 });
    }
    if (url.includes('/verify-webhook-signature')) {
      return new Response(
        JSON.stringify({ verification_status: verifySignature ? 'SUCCESS' : 'FAILURE' }),
        { status: 200 },
      );
    }
    if (url.includes('/rest/v1/purchases')) {
      // **Emulates real Postgres**: a PATCH with status=eq.pending in the query fails
      // silently (0 rows) if the row is no longer pending.
      if (init.method === 'PATCH') {
        const matchesOrder = url.includes(`paypal_order_id=eq.${purchase.paypal_order_id}`);
        const requiresPending = url.includes('status=eq.pending');
        if (matchesOrder && (!requiresPending || purchase.status === 'pending')) {
          Object.assign(purchase, JSON.parse(String(init.body)));
          return new Response(JSON.stringify([{ ...purchase }]), { status: 200 });
        }
        return new Response('[]', { status: 200 });
      }
      if (url.includes(`paypal_order_id=eq.${purchase.paypal_order_id}`)) {
        return new Response(JSON.stringify([{ ...purchase }]), { status: 200 });
      }
      return new Response('[]', { status: 200 });
    }
    if (url.includes('/rest/v1/user_trips')) {
      return new Response(JSON.stringify(trip ? [{ data: trip }] : []), { status: 200 });
    }
    if (url.includes('/rest/v1/profiles')) {
      if (init.method === 'PATCH') {
        if (profile && url.includes(`user_id=eq.${profile.user_id}`)) {
          Object.assign(profile, JSON.parse(String(init.body)));
          return new Response(JSON.stringify([{ ...profile }]), { status: 200 });
        }
        return new Response('[]', { status: 200 });
      }
      if (profile && url.includes(`user_id=eq.${profile.user_id}`)) {
        return new Response(JSON.stringify([{ ...profile }]), { status: 200 });
      }
      return new Response('[]', { status: 200 });
    }
    return new Response('{}', { status: 500 });
  }) as typeof fetch;
});

afterEach(() => {
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  globalThis.fetch = realFetch;
});

const load = () => import('./processCheckWebhook.ts?' + Math.random().toString(36).slice(2));

const HEADERS: WebhookHeaders = {
  authAlgo: 'SHA256withRSA',
  certUrl: 'https://api.paypal.com/cert',
  transmissionId: 'tx-1',
  transmissionSig: 'sig',
  transmissionTime: '2026-08-12T00:00:00Z',
};

function eventBody(overrides: Partial<{ amountValue: string; currency: string; captureId: string }> = {}) {
  return JSON.stringify({
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    resource: {
      id: overrides.captureId ?? 'CAP1',
      status: 'COMPLETED',
      amount: { value: overrides.amountValue ?? '29.90', currency_code: overrides.currency ?? 'ILS' },
      supplementary_data: { related_ids: { order_id: 'ORDER1' } },
    },
  });
}

test('webhook תקין - הרכישה עוברת ל-paid עם דוח אמיתי, שאינו ריק', async () => {
  const { processCheckWebhook } = await load();
  const res = await processCheckWebhook(eventBody(), HEADERS);
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(purchase.status, 'paid');
  assert.equal(purchase.paypal_capture_id, 'CAP1');
  assert.equal((purchase.report as { tripName: string }).tripName, 'טיול בדיקה');
  assert.equal((purchase.report as { placesChecked: number }).placesChecked, 1);
});

test('**webhook כפול (אותה לכידה נשלחת פעמיים) - הפעם השנייה היא no-op, לא הענקה כפולה**', async () => {
  const { processCheckWebhook } = await load();
  await processCheckWebhook(eventBody(), HEADERS);
  assert.equal(purchase.status, 'paid');
  const capturedAfterFirst = purchase.paypal_capture_id;

  const res2 = await processCheckWebhook(eventBody(), HEADERS);
  assert.equal(res2.status, 200);
  assert.equal(res2.body.alreadyProcessed, true);
  assert.equal(purchase.status, 'paid');
  assert.equal(purchase.paypal_capture_id, capturedAfterFirst, 'שום דבר לא נכתב מחדש בפעם השנייה');
});

test('**חתימה לא תקפה - 400, הרכישה לא זזה**', async () => {
  verifySignature = false;
  const { processCheckWebhook } = await load();
  const res = await processCheckWebhook(eventBody(), HEADERS);
  assert.equal(res.status, 400);
  assert.equal(purchase.status, 'pending');
});

test('**אי-התאמת סכום - לא מוענקת גישה, הרכישה מסומנת נכשלה**', async () => {
  const { processCheckWebhook } = await load();
  const res = await processCheckWebhook(eventBody({ amountValue: '1.00' }), HEADERS);
  assert.equal(res.status, 200);
  assert.equal(res.body.reason, 'amount-mismatch');
  assert.equal(purchase.status, 'failed');
});

test('מטבע לא תואם (גם אם הסכום זהה) נדחה כאי-התאמה', async () => {
  const { processCheckWebhook } = await load();
  await processCheckWebhook(eventBody({ currency: 'USD' }), HEADERS);
  assert.equal(purchase.status, 'failed');
});

test('אירוע שאינו PAYMENT.CAPTURE.COMPLETED מאושר בלי לגעת בכלום', async () => {
  const { processCheckWebhook } = await load();
  const res = await processCheckWebhook(JSON.stringify({ event_type: 'CHECKOUT.ORDER.APPROVED' }), HEADERS);
  assert.equal(res.status, 200);
  assert.equal(purchase.status, 'pending');
});

test('שולם אבל הטיול לא נמצא - עדיין מוענקת גישה (שילמו), הדוח אומר זאת בפירוש', async () => {
  trip = null;
  const { processCheckWebhook } = await load();
  const res = await processCheckWebhook(eventBody(), HEADERS);
  assert.equal(res.status, 200);
  assert.equal(purchase.status, 'paid', 'שילמו - לא משאירים אותם בלי גישה');
  assert.equal((purchase.report as { tripName: string }).tripName, '(הטיול לא נמצא)');
});

test('לא מוגדר (בלי מפתחות) - 503, בלי בקשה לרשת', async () => {
  delete process.env.PAYPAL_CLIENT_ID_SANDBOX;
  delete process.env.PAYPAL_CLIENT_SECRET_SANDBOX;
  delete process.env.PAYPAL_WEBHOOK_ID_SANDBOX;
  const { processCheckWebhook } = await load();
  const res = await processCheckWebhook(eventBody(), HEADERS);
  assert.equal(res.status, 503);
  assert.equal(purchase.status, 'pending');
});

/* ---------- The premium subscription: the same webhook, BILLING.SUBSCRIPTION events ---------- */

const SUB_USER = 'c80e1062-403d-4bde-87d1-095cf40a6462';

function subEvent(type: string, customId: string = SUB_USER): string {
  return JSON.stringify({
    event_type: type,
    resource: { id: 'I-SUB123', custom_id: customId, status: 'ACTIVE' },
  });
}

test('SUBSCRIPTION.ACTIVATED מדליק פרימיום עם plan_source=paypal', async () => {
  profile = { user_id: SUB_USER, plan: 'free', plan_source: null };
  const { processCheckWebhook } = await load();
  const res = await processCheckWebhook(subEvent('BILLING.SUBSCRIPTION.ACTIVATED'), HEADERS);
  assert.equal(res.status, 200);
  assert.equal(profile.plan, 'premium');
  assert.equal(profile.plan_source, 'paypal');
});

test('SUBSCRIPTION.CANCELLED מוריד רק פרימיום שמקורו PayPal - הענקת אדמין שורדת', async () => {
  profile = { user_id: SUB_USER, plan: 'premium', plan_source: 'grant' };
  const { processCheckWebhook } = await load();
  await processCheckWebhook(subEvent('BILLING.SUBSCRIPTION.CANCELLED'), HEADERS);
  assert.equal(profile.plan, 'premium', 'הענקה ידנית אינה של PayPal להוריד');
  assert.equal(profile.plan_source, 'grant');

  profile = { user_id: SUB_USER, plan: 'premium', plan_source: 'paypal' };
  const { processCheckWebhook: run2 } = await load();
  await run2(subEvent('BILLING.SUBSCRIPTION.CANCELLED'), HEADERS);
  assert.equal(profile.plan, 'free');
  assert.equal(profile.plan_source, null);
});

test('custom_id שאינו uuid - נבלע בלי לגעת בכלום (הגנת צורה)', async () => {
  profile = { user_id: SUB_USER, plan: 'free', plan_source: null };
  const { processCheckWebhook } = await load();
  const res = await processCheckWebhook(
    subEvent('BILLING.SUBSCRIPTION.ACTIVATED', 'not-a-uuid'),
    HEADERS,
  );
  assert.equal(res.status, 200);
  assert.equal(profile.plan, 'free');
});

test('אירוע מנוי עם חתימה לא תקפה - 400, שום דבר לא משתנה', async () => {
  verifySignature = false;
  profile = { user_id: SUB_USER, plan: 'free', plan_source: null };
  const { processCheckWebhook } = await load();
  const res = await processCheckWebhook(subEvent('BILLING.SUBSCRIPTION.ACTIVATED'), HEADERS);
  assert.equal(res.status, 400);
  assert.equal(profile.plan, 'free');
});
