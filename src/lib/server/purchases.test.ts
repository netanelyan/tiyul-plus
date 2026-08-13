/**
 * שכבת ה-DB של הרכישות. **הטענה המרכזית: `markPaid` היא עדכון מותנה
 * שדורש `status=pending` בשאילתה עצמה** - זה מה שהופך webhook כפול
 * ל-no-op ב-Postgres האמיתי, ולא בדיקה כלשהי בקוד. הטסט כאן מוודא
 * שהתנאי הזה נשלח בפועל, ושכשהדאטהבייס (המדומה) מחזיר אפס שורות -
 * בדיוק מה שקורה כשהשורה כבר לא `pending` - הפונקציה מחזירה `null`.
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
const saved: Record<string, string | undefined> = {};
const realFetch = globalThis.fetch;

let calls: { url: string; init: RequestInit }[] = [];
let respond: (url: string, init: RequestInit) => Response = () => new Response('[]', { status: 200 });

beforeEach(() => {
  for (const k of ENV) saved[k] = process.env[k];
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_service';
  calls = [];
  globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    return respond(url, init);
  }) as typeof fetch;
});

afterEach(() => {
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  globalThis.fetch = realFetch;
});

const load = () => import('./purchases.ts?' + Math.random().toString(36).slice(2));

const REPORT = {
  generatedAt: '2026-08-12T00:00:00.000Z',
  tripName: 'x',
  placesChecked: 0,
  placesFlagged: [],
  kosherChecked: 0,
  kosherNotes: [],
  calendarFindings: [],
  routeOk: true,
  itinerary: [],
};

test('יצירת רכישה - pending, source=paypal, בלי paypal_order_id', async () => {
  const { createPendingPurchase } = await load();
  respond = () => new Response(JSON.stringify([{ id: 'row-1' }]), { status: 201 });
  const row = await createPendingPurchase({ userId: 'u1', tripId: 't1', amount: 29.9, currency: 'ILS', mode: 'sandbox' });
  assert.equal(row?.id, 'row-1');
  const body = JSON.parse(String(calls[0].init.body));
  assert.equal(body.status, 'pending');
  assert.equal(body.source, 'paypal');
  assert.equal(body.amount, 29.9);
  assert.equal('paypal_order_id' in body, false);
});

test('**markPaid שולחת WHERE על paypal_order_id וגם על status=pending**', async () => {
  const { markPaid } = await load();
  respond = () => new Response(JSON.stringify([{ id: 'row-1', status: 'paid' }]), { status: 200 });
  await markPaid('ORDER1', { captureId: 'CAP1', payerEmail: null, report: REPORT, rawWebhook: {} });

  const url = calls[0].url;
  assert.match(url, /paypal_order_id=eq\.ORDER1/);
  assert.match(url, /status=eq\.pending/);
  assert.equal(calls[0].init.method, 'PATCH');
});

test('**webhook כפול: הדאטהבייס מחזיר 0 שורות (השורה כבר לא pending) - markPaid מחזירה null**', async () => {
  const { markPaid } = await load();
  respond = () => new Response('[]', { status: 200 }); // בדיוק מה ש-PostgREST מחזיר על WHERE שלא תפס שורה
  const result = await markPaid('ORDER1', { captureId: 'CAP1', payerEmail: null, report: REPORT, rawWebhook: {} });
  assert.equal(result, null, 'עדכון שני על אותה הזמנה לא אמור "להצליח" שוב');
});

test('הענקה ידנית: amount=0 ו-source=admin_grant, לעולם לא נספרת כתשלום', async () => {
  const { adminGrant } = await load();
  respond = () => new Response(JSON.stringify([{ id: 'row-2' }]), { status: 201 });
  await adminGrant({ userId: 'u1', tripId: 't1', grantedBy: 'admin1', note: 'תמיכה', report: REPORT });
  const body = JSON.parse(String(calls[0].init.body));
  assert.equal(body.amount, 0);
  assert.equal(body.source, 'admin_grant');
  assert.equal(body.status, 'paid');
  assert.equal(body.granted_by, 'admin1');
});

test('בדיקה כלולה בפרימיום: amount=0 ו-source=premium_included, לא נספרת כתשלום ולא כהענקה', async () => {
  const { grantPremiumIncluded } = await load();
  respond = () => new Response(JSON.stringify([{ id: 'row-3' }]), { status: 201 });
  await grantPremiumIncluded({ userId: 'u1', tripId: 't1', report: REPORT });
  const body = JSON.parse(String(calls[0].init.body));
  assert.equal(body.amount, 0);
  assert.equal(body.source, 'premium_included');
  assert.equal(body.status, 'paid');
  assert.equal(body.granted_by, undefined, 'זו הטבת מנוי אוטומטית, לא הענקה של אדם - אין granted_by');
});

test('שלילה: מסננת status=paid בלבד, לא נוגעת ברכישות שלא שולמו', async () => {
  const { adminRevoke } = await load();
  respond = () => new Response('[]', { status: 200 });
  await adminRevoke({ userId: 'u1', tripId: 't1', grantedBy: 'admin1', note: '' });
  assert.match(calls[0].url, /status=eq\.paid/);
  const body = JSON.parse(String(calls[0].init.body));
  assert.equal(body.status, 'revoked');
});

test('סטטיסטיקה: הכנסה נספרת רק מ-paypal ששולם, לא מהענקות', async () => {
  const { computeStats } = await load();
  const now = new Date();
  const old = new Date(now.getTime() - 20 * 60_000).toISOString(); // 20 דקות - מעל הסף
  const recent = new Date(now.getTime() - 2 * 60_000).toISOString(); // 2 דקות - מתחת לסף
  const rows = [
    { id: '1', user_id: 'u', trip_id: 't', status: 'paid', source: 'paypal', amount: 29.9, created_at: now.toISOString() },
    { id: '2', user_id: 'u', trip_id: 't', status: 'paid', source: 'admin_grant', amount: 0, created_at: now.toISOString() },
    { id: '3', user_id: 'u', trip_id: 't', status: 'pending', source: 'paypal', amount: 29.9, created_at: old },
    { id: '4', user_id: 'u', trip_id: 't', status: 'pending', source: 'paypal', amount: 29.9, created_at: recent },
    { id: '5', user_id: 'u', trip_id: 't', status: 'failed', source: 'paypal', amount: 29.9, created_at: now.toISOString() },
    { id: '6', user_id: 'u', trip_id: 't2', status: 'paid', source: 'premium_included', amount: 0, created_at: now.toISOString() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any[];
  const stats = computeStats(rows);
  assert.equal(stats.revenueILS, 29.9, 'הטבת פרימיום לא נחשבת הכנסה, בדיוק כמו הענקה ידנית');
  assert.equal(stats.paidCount, 3);
  assert.equal(stats.adminGrantCount, 1);
  // המונה החדש נספר בנפרד - לא נבלע בתוך adminGrantCount, כדי שהתמונה
  // תבדיל בין תמיכה אנושית לבין הטבת מנוי אוטומטית
  assert.equal(stats.premiumIncludedCount, 1);
  assert.equal(stats.pendingCount, 2);
  assert.equal(stats.failedCount, 1);
  assert.equal(stats.stuckPending.length, 1, 'רק ה-pending בת 20 הדקות אמורה להיחשב תקועה');
  assert.equal(stats.stuckPending[0].id, '3');
});
