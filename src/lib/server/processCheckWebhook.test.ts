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
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY',
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
  /**
   * Which product. Absent means the pre-departure check, matching the column's
   * default - so every existing test in this file keeps exercising the check path
   * without being touched.
   */
  product?: string;
}

let purchase: DbPurchase;
let trip: unknown;
let verifySignature: boolean;
/** A profiles row for the mock - the subscription events read from and write to it */
let profile: {
  user_id: string;
  plan: string;
  plan_source: string | null;
  /** Null/absent = never expires. The trip pass is the only thing that sets it here. */
  plan_until?: string | null;
} | null;
/**
 * The stored PayPal billing-plan ids, i.e. what `planIdToPlan` reads. Kept
 * mutable so a test can empty it and prove what happens when the lookup fails.
 */
let planFlags: Record<string, string>;
/** What left for Resend - the emails the webhook triggered */
let mailSent: { to: string[]; subject: string; html: string }[];
/** The address GoTrue's admin API returns for any user id, or null for a 404 */
let userEmail: string | null;

beforeEach(() => {
  for (const k of ENV) saved[k] = process.env[k];
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_service';
  process.env.PAYPAL_API_BASE = 'https://mock.paypal.test';
  process.env.PAYPAL_CLIENT_ID_SANDBOX = 'c';
  process.env.PAYPAL_CLIENT_SECRET_SANDBOX = 's';
  process.env.PAYPAL_WEBHOOK_ID_SANDBOX = 'wh';
  delete process.env.PAYPAL_MODE;
  delete process.env.RESEND_API_KEY;
  mailSent = [];
  userEmail = null;

  verifySignature = true;
  profile = null;
  planFlags = {
    paypal_plan_id_sandbox: 'P-PREMIUM',
    paypal_plan_id_sandbox_pro: 'P-PRO',
  };
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
    if (url.startsWith('https://api.resend.com/')) {
      mailSent.push(JSON.parse(String(init.body)));
      return new Response(JSON.stringify({ id: 're_1' }), { status: 200 });
    }
    if (url.includes('/auth/v1/admin/users/')) {
      return userEmail
        ? new Response(JSON.stringify({ email: userEmail }), { status: 200 })
        : new Response('{}', { status: 404 });
    }
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
    if (url.includes('/rest/v1/app_flags')) {
      // Only GET matters here; the reverse plan lookup never writes.
      return new Response(
        JSON.stringify(Object.entries(planFlags).map(([key, value]) => ({ key, value }))),
        { status: 200 },
      );
    }
    if (url.includes('/rest/v1/profiles')) {
      if (init.method === 'PATCH') {
        if (profile && url.includes(`user_id=eq.${profile.user_id}`)) {
          Object.assign(profile, JSON.parse(String(init.body)));
          return new Response(JSON.stringify([{ ...profile }]), { status: 200 });
        }
        return new Response('[]', { status: 200 });
      }
      /*
        The upsert path. `applyTripPass` PATCHes first and falls back to an insert
        when that matches no row, because a paying customer may genuinely have no
        profiles row yet (the app creates one lazily). Without this branch that
        fallback would look like a database failure and a real purchase would alert
        instead of granting.
      */
      if (init.method === 'POST') {
        profile = JSON.parse(String(init.body)) as typeof profile;
        return new Response(JSON.stringify([{ ...profile }]), { status: 200 });
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

/* ---------- Switching plans: revise, and the field that must decide it ---------- */

/** A subscription event that also carries which billing plan it is on NOW. */
function subEventOnPlan(type: string, planId: string, customId: string = SUB_USER): string {
  return JSON.stringify({
    event_type: type,
    resource: { id: 'I-SUB123', custom_id: customId, status: 'ACTIVE', plan_id: planId },
  });
}

test('**שדרוג ב-revise: התוכנית נקבעת מ-plan_id, לא מ-custom_id שנשאר פרימיום לנצח**', async () => {
  /*
    THE test of the whole revise flow. The subscriber signed up for premium, so
    their custom_id is a bare uuid and will say premium forever - PayPal echoes
    the string set at creation. Reading the plan from it here would demote the
    person on the very webhook confirming they now pay MORE.
  */
  profile = { user_id: SUB_USER, plan: 'premium', plan_source: 'paypal' };
  const { processCheckWebhook } = await load();
  const res = await processCheckWebhook(
    subEventOnPlan('BILLING.SUBSCRIPTION.UPDATED', 'P-PRO'),
    HEADERS,
  );
  assert.equal(res.status, 200);
  assert.equal(res.body.plan, 'pro');
  assert.equal(profile.plan, 'pro', 'custom_id אמר פרימיום - plan_id הוא שקובע');
  assert.equal(profile.plan_source, 'paypal');
});

test('UPDATED עם plan_id שאיננו מכירים - שום דבר לא משתנה', async () => {
  /*
    An UPDATED event exists precisely because something changed, so "I cannot
    identify the plan" must never resolve to "assume the old value still holds".
    Fail closed and leave it to a human.
  */
  profile = { user_id: SUB_USER, plan: 'premium', plan_source: 'paypal' };
  const { processCheckWebhook } = await load();
  const res = await processCheckWebhook(
    subEventOnPlan('BILLING.SUBSCRIPTION.UPDATED', 'P-SOMETHING-ELSE'),
    HEADERS,
  );
  assert.equal(res.status, 200);
  assert.equal(res.body.reason, 'unknown-plan');
  assert.equal(profile.plan, 'premium', 'לא הועלה ולא הורד');
});

test('UPDATED כשקריאת הדגלים נכשלת - גם אז לא נוגעים בתוכנית', async () => {
  planFlags = {};
  profile = { user_id: SUB_USER, plan: 'premium', plan_source: 'paypal' };
  const { processCheckWebhook } = await load();
  const res = await processCheckWebhook(
    subEventOnPlan('BILLING.SUBSCRIPTION.UPDATED', 'P-PRO'),
    HEADERS,
  );
  assert.equal(res.body.reason, 'unknown-plan');
  assert.equal(profile.plan, 'premium');
});

test('ACTIVATED עם plan_id של פרו מדליק פרו - גם כשה-custom_id הוא uuid חשוף', async () => {
  profile = { user_id: SUB_USER, plan: 'free', plan_source: null };
  const { processCheckWebhook } = await load();
  await processCheckWebhook(subEventOnPlan('BILLING.SUBSCRIPTION.ACTIVATED', 'P-PRO'), HEADERS);
  assert.equal(profile.plan, 'pro');
});

test('ACTIVATED בלי plan_id בכלל - נופל ל-custom_id, וזו התאימות לאחור', async () => {
  // Every subscription created before the pro plan existed looks exactly like this.
  profile = { user_id: SUB_USER, plan: 'free', plan_source: null };
  const { processCheckWebhook } = await load();
  await processCheckWebhook(subEvent('BILLING.SUBSCRIPTION.ACTIVATED'), HEADERS);
  assert.equal(profile.plan, 'premium');

  profile = { user_id: SUB_USER, plan: 'free', plan_source: null };
  const { processCheckWebhook: run2 } = await load();
  await run2(subEvent('BILLING.SUBSCRIPTION.ACTIVATED', `${SUB_USER}|pro`), HEADERS);
  assert.equal(profile.plan, 'pro');
});

test('ביטול אחרי שדרוג עדיין מוריד לחינם - revise לא שינה את plan_source', async () => {
  profile = { user_id: SUB_USER, plan: 'premium', plan_source: 'paypal' };
  const { processCheckWebhook } = await load();
  await processCheckWebhook(subEventOnPlan('BILLING.SUBSCRIPTION.UPDATED', 'P-PRO'), HEADERS);
  assert.equal(profile.plan, 'pro');

  const { processCheckWebhook: run2 } = await load();
  await run2(subEvent('BILLING.SUBSCRIPTION.CANCELLED'), HEADERS);
  assert.equal(profile.plan, 'free', 'מנוי פרו שבוטל חוזר לחינם כמו כל מנוי');
});

/* ---------- The emails the webhook triggers ---------- */

/** The sends are fire-and-forget behind a GoTrue lookup; give them a tick. */
const settle = () => new Promise((r) => setTimeout(r, 30));
const PURCHASER = '7d0d0d0d-1111-4222-8333-944444444444';

test('**a paid capture sends one receipt - and a duplicate webhook sends none**', async () => {
  process.env.RESEND_API_KEY = 're_test';
  userEmail = 'buyer@example.com';
  purchase.user_id = PURCHASER;
  const { processCheckWebhook } = await load();
  await processCheckWebhook(eventBody(), HEADERS);
  await settle();
  assert.equal(mailSent.length, 1);
  assert.deepEqual(mailSent[0].to, ['buyer@example.com']);
  assert.match(mailSent[0].subject, /קבלה/);
  assert.match(mailSent[0].subject, /טיול בדיקה/);
  assert.match(mailSent[0].html, /ORDER1/, 'the PayPal order id is the order number on the receipt');
  assert.match(mailSent[0].html, /29\.90 ₪/);
  assert.doesNotMatch(mailSent[0].html, /\{\{[A-Z_]+\}\}/);

  await processCheckWebhook(eventBody(), HEADERS);
  await settle();
  assert.equal(mailSent.length, 1, 'the second webhook is a no-op for the receipt too');
});

test('no receipt when the mailer is unconfigured, and the grant is unaffected', async () => {
  userEmail = 'buyer@example.com';
  purchase.user_id = PURCHASER;
  const { processCheckWebhook } = await load();
  await processCheckWebhook(eventBody(), HEADERS);
  await settle();
  assert.equal(purchase.status, 'paid');
  assert.equal(mailSent.length, 0);
});

test('ACTIVATED sends the welcome-to-premium email, naming the plan and its real price', async () => {
  process.env.RESEND_API_KEY = 're_test';
  userEmail = 'sub@example.com';
  profile = { user_id: SUB_USER, plan: 'free', plan_source: null };
  const { processCheckWebhook } = await load();
  await processCheckWebhook(
    JSON.stringify({
      event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
      resource: {
        id: 'I-1',
        custom_id: `${SUB_USER}|pro`,
        plan_id: 'P-PRO',
        billing_info: { next_billing_time: '2026-10-20T10:00:00Z' },
      },
    }),
    HEADERS,
  );
  await settle();
  assert.equal(mailSent.length, 1);
  assert.match(mailSent[0].subject, /פרו/);
  assert.match(mailSent[0].html, /89\.90 ₪/);
  assert.match(mailSent[0].html, /20 באוקטובר 2026/);
});

test('**CANCELLED after an upgrade names the plan that actually ended (pro), not the one custom_id remembers**', async () => {
  process.env.RESEND_API_KEY = 're_test';
  userEmail = 'sub@example.com';
  profile = { user_id: SUB_USER, plan: 'pro', plan_source: 'paypal' };
  const { processCheckWebhook } = await load();
  await processCheckWebhook(subEvent('BILLING.SUBSCRIPTION.CANCELLED'), HEADERS);
  await settle();
  assert.equal(profile.plan, 'free');
  assert.equal(mailSent.length, 1);
  assert.match(mailSent[0].html, /המנוי <strong>פרו<\/strong> הסתיים/);
});

test('CANCELLED on an admin grant downgrades nothing and therefore emails nothing', async () => {
  process.env.RESEND_API_KEY = 're_test';
  userEmail = 'sub@example.com';
  profile = { user_id: SUB_USER, plan: 'premium', plan_source: 'grant' };
  const { processCheckWebhook } = await load();
  await processCheckWebhook(subEvent('BILLING.SUBSCRIPTION.CANCELLED'), HEADERS);
  await settle();
  assert.equal(mailSent.length, 0);
});

test('PAYMENT.FAILED changes no plan and tells the subscriber, with the retry date when PayPal gives one', async () => {
  process.env.RESEND_API_KEY = 're_test';
  userEmail = 'sub@example.com';
  profile = { user_id: SUB_USER, plan: 'premium', plan_source: 'paypal' };
  const { processCheckWebhook } = await load();
  const res = await processCheckWebhook(
    JSON.stringify({
      event_type: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
      resource: { id: 'I-1', custom_id: SUB_USER, billing_info: { next_billing_time: '2026-10-03T00:00:00Z' } },
    }),
    HEADERS,
  );
  await settle();
  assert.equal(res.body.notified, true);
  assert.equal(profile.plan, 'premium', 'a failed payment is not a downgrade');
  assert.equal(mailSent.length, 1);
  assert.match(mailSent[0].html, /ב-3 באוקטובר 2026/);
});

/* ============================================================
 *  The trip pass - the same money rails, a different product
 *
 *  What these are really testing is the ORDERING inside the branch. markPaid is a
 *  conditional update on status='pending', which makes it the idempotency gate, so
 *  it has to run BEFORE the grant. Granting first would hand a second window to
 *  anyone whose webhook PayPal delivers twice - and duplicate delivery is normal.
 * ============================================================ */

const PASS_USER = '9f1c4a2e-5b6d-4e7f-8a90-1b2c3d4e5f60';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Turn `purchase` into a paid-for trip pass rather than a check. */
function asTripPass(overrides: Partial<DbPurchase> = {}) {
  Object.assign(purchase, {
    user_id: PASS_USER,
    amount: 49,
    product: 'trip-pass',
    ...overrides,
  });
}

/**
 * The profiles row the webhook just wrote, asserted to exist.
 *
 * A helper rather than `assert.ok(profile)` at each site: `profile` is assigned
 * by the fetch mock's closure, which TypeScript cannot see, so after
 * `profile = null` it narrows the variable to `null` and an `assert.ok` on it
 * narrows to `never` - making every field read an error. Reading through a
 * function that re-widens once, in one place, keeps the tests about behaviour
 * instead of about narrowing.
 */
function grantedProfile() {
  if (!profile) throw new Error('expected a profiles row to have been written');
  return profile;
}

const daysFromNow = (iso: string) => Math.round((Date.parse(iso) - Date.now()) / DAY_MS);

test('a paid trip pass grants a 60-day premium window with plan_source=trip_pass', async () => {
  asTripPass();
  profile = null; // no profiles row yet - the ordinary state for a new buyer
  const { processCheckWebhook } = await load();
  const res = await processCheckWebhook(eventBody({ amountValue: '49.00' }), HEADERS);

  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(purchase.status, 'paid');
  const p = grantedProfile();
  assert.equal(p.plan, 'premium');
  assert.equal(p.plan_source, 'trip_pass');
  assert.equal(daysFromNow(String(p.plan_until)), 60);
});

test('the pass writes NO report - that column belongs to the check', async () => {
  /*
    markPaid omits the field rather than nulling it, so a retried capture cannot
    blank a report a previous attempt stored. For a pass there is simply nothing
    to store, and writing an empty report would put a meaningless document on a
    purchase that never promised one.
  */
  asTripPass();
  const { processCheckWebhook } = await load();
  await processCheckWebhook(eventBody({ amountValue: '49.00' }), HEADERS);
  assert.equal(purchase.report, undefined);
});

test('**a duplicate pass webhook is a no-op - it does not grant a second window**', async () => {
  asTripPass();
  profile = null;
  const { processCheckWebhook } = await load();

  await processCheckWebhook(eventBody({ amountValue: '49.00' }), HEADERS);
  const afterFirst = String(grantedProfile().plan_until);
  assert.equal(daysFromNow(afterFirst), 60);

  // PayPal delivers the same capture again - routine, not exceptional.
  const second = await processCheckWebhook(eventBody({ amountValue: '49.00' }), HEADERS);

  /*
    Caught by the `status !== 'pending'` guard that runs before the product branch,
    which is the FIRST line of defence and shared with the check. The branch's own
    "markPaid affected 0 rows" path is the second one, for a genuine race where two
    deliveries both read 'pending' before either writes - unreachable from here,
    which is why this asserts the outcome rather than which guard produced it.
  */
  assert.equal(second.body.alreadyProcessed, true);
  assert.equal(
    String(grantedProfile().plan_until),
    afterFirst,
    'the window must be untouched - 120 days for one payment is the bug this ordering prevents',
  );
});

test('a second pass bought on top of a live one EXTENDS it rather than resetting', async () => {
  // The order id must stay ORDER1 - that is the id `eventBody` puts in the event,
  // and changing it means the webhook finds no purchase and returns before the branch.
  asTripPass();
  profile = {
    user_id: PASS_USER,
    plan: 'premium',
    plan_source: 'trip_pass',
    plan_until: new Date(Date.now() + 20 * DAY_MS).toISOString(),
  };
  const { processCheckWebhook } = await load();
  await processCheckWebhook(eventBody({ amountValue: '49.00' }), HEADERS);

  assert.equal(
    daysFromNow(String(profile.plan_until)),
    80,
    'the 20 days they already had must be added to, not confiscated',
  );
});

test('a pro subscriber who buys a pass is not demoted to premium', async () => {
  asTripPass();
  profile = {
    user_id: PASS_USER,
    plan: 'pro',
    plan_source: 'grant',
    plan_until: new Date(Date.now() + 5 * DAY_MS).toISOString(),
  };
  const { processCheckWebhook } = await load();
  await processCheckWebhook(eventBody({ amountValue: '49.00' }), HEADERS);

  assert.equal(profile.plan, 'pro', 'downgrading somebody in the act of paying us is the worst case');
  assert.equal(daysFromNow(String(profile.plan_until)), 65);
});

test('paid but ungrantable - the money is recorded, and it alerts instead of failing quietly', async () => {
  /*
    An unlimited subscriber whose payment somehow completed (a race against their
    own subscription activating, say). There is nothing to grant - writing a
    60-day expiry would SHORTEN an open-ended plan - so the grant refuses, and
    that has to be loud: the money arrived and the buyer has nothing new.
  */
  asTripPass();
  profile = { user_id: PASS_USER, plan: 'premium', plan_source: 'paypal', plan_until: null };
  const { processCheckWebhook } = await load();
  const res = await processCheckWebhook(eventBody({ amountValue: '49.00' }), HEADERS);

  assert.equal(res.body.ok, false);
  assert.equal(res.body.reason, 'already-unlimited');
  assert.equal(purchase.status, 'paid', 'the payment still happened and must stay recorded');
  assert.equal(profile.plan_until, null, 'their unlimited plan must not have gained an expiry');
});

test('the pass amount is verified like any other - ₪29.90 on a ₪49 pass is rejected', async () => {
  /*
    The amount check is upstream of the product branch, so this is really asserting
    that adding the branch did not step in front of it. Paying the check price for
    a pass must not grant a pass.
  */
  asTripPass();
  profile = null;
  const { processCheckWebhook } = await load();
  const res = await processCheckWebhook(eventBody({ amountValue: '29.90' }), HEADERS);

  assert.equal(res.body.reason, 'amount-mismatch');
  assert.equal(purchase.status, 'failed');
  assert.equal(profile, null, 'no plan may be written on a mismatched amount');
});

test('a paid pass sends exactly one receipt, and it states when access ends', async () => {
  process.env.RESEND_API_KEY = 're_test';
  userEmail = 'buyer@example.com';
  asTripPass();
  profile = null;
  const { processCheckWebhook } = await load();
  await processCheckWebhook(eventBody({ amountValue: '49.00' }), HEADERS);
  await settle();

  assert.equal(mailSent.length, 1, 'one receipt');
  assert.match(mailSent[0].subject, /כרטיס הטיול/);
  /*
    The expiry has to be IN the receipt, and it has to be the real granted date -
    the mailer is handed `applied.until` rather than recomputing now+60, because
    for an extension the honest answer is 80 days out and a recomputed one would
    lie by 20 days.
  */
  const until = String(grantedProfile().plan_until).slice(0, 10);
  const { formatHebrewDate } = await import('../trip/dates.ts');
  const untilHe = formatHebrewDate(until, { year: true });
  assert.ok(untilHe, 'precondition: the date formats');
  assert.ok(
    mailSent[0].html.includes(untilHe),
    `the receipt must state the real expiry (${untilHe}) - it is handed applied.until rather ` +
      `than recomputing now+60, because for an extension the honest answer is 80 days out and ` +
      `a recomputed one would be wrong by 20`,
  );
  /*
    A pass must not read as a subscription. Asserted as the specific promise rather
    than by banning the word for subscription: the footnote legitimately CONTAINS it,
    in the sentence whose whole job is to say no subscription was opened. Banning the
    word would have failed on the very copy that makes the point.
  */
  assert.match(mailSent[0].html, /לא נפתח מנוי/, 'must say plainly that nothing recurs');
  assert.match(mailSent[0].html, /חד-פעמי/);
});
