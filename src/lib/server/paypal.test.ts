/**
 * PayPal בלי SDK - **שלוש טענות אבטחה, וכולן על מה שאסור לקרות.**
 *
 * 1. המחיר בבקשת היצירה הוא תמיד `priceILS.toFixed(2)` - הפרמטר שהעביר
 *    הקורא, אף פעם לא ערך שממציא הקובץ הזה.
 * 2. `paypalMode()` לעולם לא נופלת בשקט מ-production ל-sandbox: בלי
 *    מפתח חי, `PAYPAL_MODE=production` הוא `off`, לא sandbox.
 * 3. `verifyWebhookSignature` שולחת את ה-`webhook_id` שהוגדר **אצלנו**,
 *    לא כל דבר שהגיע בכותרות הבקשה.
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const ENV = [
  'PAYPAL_MODE', 'PAYPAL_API_BASE',
  'PAYPAL_CLIENT_ID_SANDBOX', 'PAYPAL_CLIENT_SECRET_SANDBOX', 'PAYPAL_WEBHOOK_ID_SANDBOX',
  'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID',
] as const;
const saved: Record<string, string | undefined> = {};
const realFetch = globalThis.fetch;

let calls: { url: string; init: RequestInit }[] = [];
let respond: (url: string, init: RequestInit) => Response = () => new Response('{}', { status: 500 });

beforeEach(() => {
  for (const k of ENV) saved[k] = process.env[k];
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

const load = () => import('./paypal.ts?' + Math.random().toString(36).slice(2));

function configureSandbox() {
  process.env.PAYPAL_API_BASE = 'https://mock.paypal.test';
  process.env.PAYPAL_CLIENT_ID_SANDBOX = 'sb-client';
  process.env.PAYPAL_CLIENT_SECRET_SANDBOX = 'sb-secret';
  process.env.PAYPAL_WEBHOOK_ID_SANDBOX = 'sb-webhook-id';
  delete process.env.PAYPAL_MODE;
  delete process.env.PAYPAL_CLIENT_ID;
  delete process.env.PAYPAL_CLIENT_SECRET;
  delete process.env.PAYPAL_WEBHOOK_ID;
}

const tokenResponse = () => new Response(JSON.stringify({ access_token: 'TOKEN', expires_in: 3600 }), { status: 200 });

/* ---------- 1. מצב ---------- */

test('בלי מפתחות בכלל - off', async () => {
  const { paypalMode } = await load();
  assert.equal(paypalMode(), 'off');
});

test('מפתחות sandbox בלבד - sandbox כברירת מחדל', async () => {
  configureSandbox();
  const { paypalMode } = await load();
  assert.equal(paypalMode(), 'sandbox');
});

test('**PAYPAL_MODE=production בלי מפתח חי הוא off, לא נפילה חזרה ל-sandbox**', async () => {
  configureSandbox();
  process.env.PAYPAL_MODE = 'production';
  const { paypalMode } = await load();
  assert.equal(paypalMode(), 'off');
});

test('production דורש שלושתם: client id, secret ו-webhook id', async () => {
  configureSandbox();
  process.env.PAYPAL_MODE = 'production';
  process.env.PAYPAL_CLIENT_ID = 'live-client';
  process.env.PAYPAL_CLIENT_SECRET = 'live-secret';
  // בלי PAYPAL_WEBHOOK_ID
  const { paypalMode } = await load();
  assert.equal(paypalMode(), 'off');

  process.env.PAYPAL_WEBHOOK_ID = 'live-webhook-id';
  const { paypalMode: paypalMode2 } = await load();
  assert.equal(paypalMode2(), 'production');
});

test('PAYPAL_MODE=off מכבה גם כשיש מפתחות', async () => {
  configureSandbox();
  process.env.PAYPAL_MODE = 'off';
  const { paypalMode } = await load();
  assert.equal(paypalMode(), 'off');
});

/* ---------- 2. הדומיין החי חסום ב-sandbox ---------- */

test('sandbox על הדומיין החי - חסום', async () => {
  const { sandboxBlocked } = await load();
  assert.equal(sandboxBlocked('tiyulplus.com', 'sandbox'), true);
  assert.equal(sandboxBlocked('www.tiyulplus.com', 'sandbox'), true);
  assert.equal(sandboxBlocked('tiyulplus.com:443', 'sandbox'), true);
});

test('sandbox על כל דומיין אחר - מותר', async () => {
  const { sandboxBlocked } = await load();
  assert.equal(sandboxBlocked('localhost:3000', 'sandbox'), false);
  assert.equal(sandboxBlocked(null, 'sandbox'), false);
});

test('production אף פעם לא חסום', async () => {
  const { sandboxBlocked } = await load();
  assert.equal(sandboxBlocked('tiyulplus.com', 'production'), false);
});

/* ---------- 3. יצירת הזמנה: הסכום הוא הפרמטר, ותו לא ---------- */

test('הבקשה ל-PayPal נושאת בדיוק את המחיר שהועבר, ולא משהו אחר', async () => {
  configureSandbox();
  const { createOrder } = await load();
  respond = (url) => {
    if (url.includes('/oauth2/token')) return tokenResponse();
    if (url.endsWith('/v2/checkout/orders')) {
      return new Response(
        JSON.stringify({ id: 'ORDER1', links: [{ rel: 'approve', href: 'https://paypal.test/approve/ORDER1' }] }),
        { status: 201 },
      );
    }
    return new Response('{}', { status: 500 });
  };

  const result = await createOrder('sandbox', {
    purchaseId: 'purch-1',
    priceILS: 29.9,
    tripName: 'וינה',
    returnUrl: 'https://tiyulplus.com/chat?checkReturn=1',
    cancelUrl: 'https://tiyulplus.com/chat?checkCancel=1',
  });

  assert.deepEqual(result, { orderId: 'ORDER1', approveUrl: 'https://paypal.test/approve/ORDER1' });

  const createCall = calls.find((c) => c.url.endsWith('/v2/checkout/orders'))!;
  const body = JSON.parse(String(createCall.init.body));
  assert.equal(body.purchase_units[0].amount.value, '29.90');
  assert.equal(body.purchase_units[0].amount.currency_code, 'ILS');
  assert.equal(body.purchase_units[0].custom_id, 'purch-1');
  assert.equal(body.application_context.return_url, 'https://tiyulplus.com/chat?checkReturn=1');
  const headers = createCall.init.headers as Record<string, string>;
  assert.equal(headers['PayPal-Request-Id'], 'order:purch-1');
});

test('מחיר לא חוקי (שלוש ספרות אחרי הנקודה, או שלילי) - לא יוצאת שום בקשה', async () => {
  configureSandbox();
  const { createOrder } = await load();
  respond = () => tokenResponse();

  for (const bad of [29.999, -5, 0, NaN, Infinity]) {
    calls = [];
    const r = await createOrder('sandbox', {
      purchaseId: 'p',
      priceILS: bad,
      tripName: 'x',
      returnUrl: 'https://x/',
      cancelUrl: 'https://x/',
    });
    assert.equal(r, null, `${bad} לא היה אמור להיחסם`);
    assert.deepEqual(calls, [], `${bad} לא היה אמור לצאת לרשת`);
  }
});

test('מחיר תקין עם עיגול צף (29.9 * 100 !== 2990 בדיוק) לא נדחה', async () => {
  configureSandbox();
  const { createOrder } = await load();
  respond = (url) => {
    if (url.includes('/oauth2/token')) return tokenResponse();
    return new Response(JSON.stringify({ id: 'O', links: [{ rel: 'approve', href: 'https://x' }] }), { status: 201 });
  };
  const r = await createOrder('sandbox', {
    purchaseId: 'p',
    priceILS: 29.9,
    tripName: 'x',
    returnUrl: 'https://x/',
    cancelUrl: 'https://x/',
  });
  assert.ok(r, 'המחיר האמיתי של המוצר לא אמור להידחות');
});

/* ---------- 4. לכידה ---------- */

test('לכידה מוצלחת מחזירה captureId וסכום', async () => {
  configureSandbox();
  const { captureOrder } = await load();
  respond = (url) => {
    if (url.includes('/oauth2/token')) return tokenResponse();
    return new Response(
      JSON.stringify({
        status: 'COMPLETED',
        purchase_units: [{ payments: { captures: [{ id: 'CAP1', status: 'COMPLETED', amount: { value: '29.90', currency_code: 'ILS' } }] } }],
        payer: { email_address: 'x@y.com' },
      }),
      { status: 201 },
    );
  };
  const r = await captureOrder('sandbox', 'ORDER1');
  assert.deepEqual(r, {
    ok: true,
    captureId: 'CAP1',
    status: 'COMPLETED',
    amountValue: '29.90',
    currencyCode: 'ILS',
    payerEmail: 'x@y.com',
  });
});

test('לכידה שלא הושלמה - נדחית, לא מוצגת כהצלחה', async () => {
  configureSandbox();
  const { captureOrder } = await load();
  respond = (url) => {
    if (url.includes('/oauth2/token')) return tokenResponse();
    return new Response(
      JSON.stringify({
        purchase_units: [{ payments: { captures: [{ id: 'CAP1', status: 'PENDING', amount: { value: '29.90', currency_code: 'ILS' } }] } }],
      }),
      { status: 201 },
    );
  };
  const r = await captureOrder('sandbox', 'ORDER1');
  assert.equal(r.ok, false);
  assert.equal((r as { reason: string }).reason, 'declined');
});

test('תשובת לכידה מעורערת (בלי capture) - bad-response, לא נופלת', async () => {
  configureSandbox();
  const { captureOrder } = await load();
  respond = (url) => {
    if (url.includes('/oauth2/token')) return tokenResponse();
    return new Response(JSON.stringify({ status: 'COMPLETED' }), { status: 201 });
  };
  const r = await captureOrder('sandbox', 'ORDER1');
  assert.equal(r.ok, false);
  assert.equal((r as { reason: string }).reason, 'bad-response');
});

/* ---------- 5. אימות חתימת webhook ---------- */

const FULL_HEADERS = {
  authAlgo: 'SHA256withRSA',
  certUrl: 'https://api.paypal.com/cert',
  transmissionId: 'tx-1',
  transmissionSig: 'sig',
  transmissionTime: '2026-08-12T00:00:00Z',
};

test('כותרת חסרה - נדחה בלי שום בקשה לרשת', async () => {
  configureSandbox();
  const { verifyWebhookSignature } = await load();
  const incomplete = { ...FULL_HEADERS, transmissionSig: null };
  assert.equal(await verifyWebhookSignature('sandbox', incomplete, '{}'), false);
  assert.deepEqual(calls, []);
});

test('**ה-webhook_id שנשלח הוא מהסביבה שלנו, לא מהבקשה**', async () => {
  configureSandbox();
  const { verifyWebhookSignature } = await load();
  respond = (url) => {
    if (url.includes('/oauth2/token')) return tokenResponse();
    return new Response(JSON.stringify({ verification_status: 'SUCCESS' }), { status: 200 });
  };
  const ok = await verifyWebhookSignature('sandbox', FULL_HEADERS, '{"event_type":"X"}');
  assert.equal(ok, true);

  const verifyCall = calls.find((c) => c.url.includes('verify-webhook-signature'))!;
  const body = JSON.parse(String(verifyCall.init.body));
  assert.equal(body.webhook_id, 'sb-webhook-id');
  assert.deepEqual(body.webhook_event, { event_type: 'X' });
});

test('PayPal עונה FAILURE - נדחה', async () => {
  configureSandbox();
  const { verifyWebhookSignature } = await load();
  respond = (url) => {
    if (url.includes('/oauth2/token')) return tokenResponse();
    return new Response(JSON.stringify({ verification_status: 'FAILURE' }), { status: 200 });
  };
  assert.equal(await verifyWebhookSignature('sandbox', FULL_HEADERS, '{}'), false);
});

test('גוף לא-JSON - נדחה בלי בקשה', async () => {
  configureSandbox();
  const { verifyWebhookSignature } = await load();
  assert.equal(await verifyWebhookSignature('sandbox', FULL_HEADERS, 'not json'), false);
  assert.deepEqual(calls, []);
});
