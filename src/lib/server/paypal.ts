/**
 * Server-only - **PayPal without an SDK** (hard rule 6: no new dependency), in
 * exactly the same style as `server/billing.ts` (Stripe) and `server/viator.ts`:
 * direct REST with `fetch`, keys in the server environment only, and always
 * `AbortSignal.timeout`.
 *
 * ## Two rules this file exists to enforce
 *
 * 1. **The price does not come from the client.** `createOrder` receives
 *    `priceILS` as a parameter - its only callers (`/api/checks/create-order`)
 *    pass the constant from `lib/predeparture.ts`, never a value from the
 *    request body.
 * 2. **Nothing here grants access.** This file knows how to talk to PayPal -
 *    create an order, capture a payment, and verify a webhook signature. **What
 *    happens with the result** (when `purchases.status` becomes `paid`) lives in
 *    `purchases.ts` and the webhook route only. A successful capture here is not
 *    a grant.
 *
 * ## Mode (sandbox/production), in exactly the same pattern as Viator
 *
 * The live key does not enter use until `PAYPAL_MODE=production` is written
 * explicitly, even if the key is already configured. `sandboxBlocked` blocks a
 * live domain from sandbox mode - same check, same `PROD_HOSTS`, same reason: a
 * test purchase on the real domain is the thing that must not happen even once.
 */

export type PaypalMode = 'off' | 'sandbox' | 'production';

/**
 * Requires all three credentials - including `webhookId` - and not just the
 * client id/secret. Without it a mode can "look" configured
 * (`paypalConfigured()` says yes) while webhook verification always fails
 * because there is no webhook id to check against - a state worse than "not
 * configured": it shows a payment button that always fails silently at the end.
 */
export function paypalMode(): PaypalMode {
  const raw = (process.env.PAYPAL_MODE ?? '').toLowerCase();
  if (raw === 'off') return 'off';
  if (raw === 'production') return credentials('production') ? 'production' : 'off';
  return credentials('sandbox') ? 'sandbox' : 'off';
}

export const paypalConfigured = () => paypalMode() !== 'off';

function credentials(mode: PaypalMode): { clientId: string; secret: string; webhookId: string } | null {
  if (mode === 'production') {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_CLIENT_SECRET;
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    return clientId && secret && webhookId ? { clientId, secret, webhookId } : null;
  }
  if (mode === 'sandbox') {
    const clientId = process.env.PAYPAL_CLIENT_ID_SANDBOX;
    const secret = process.env.PAYPAL_CLIENT_SECRET_SANDBOX;
    const webhookId = process.env.PAYPAL_WEBHOOK_ID_SANDBOX;
    return clientId && secret && webhookId ? { clientId, secret, webhookId } : null;
  }
  return null;
}

/** Fully overridable in tests/verification against a mock server - like STRIPE_API_BASE and VIATOR_BASE_URL */
export const paypalApiBase = (mode: PaypalMode) =>
  process.env.PAYPAL_API_BASE ??
  (mode === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');

/** PayPal's own checkout host, for building an approval link as a fallback if the response carried no `links` */
const CHECKOUT_HOST = (mode: PaypalMode) =>
  mode === 'production' ? 'https://www.paypal.com' : 'https://www.sandbox.paypal.com';

/**
 * The live domain. In sandbox mode a request from this domain is rejected
 * outright - there is no way a test purchase grants real access to a real
 * person, not even by a configuration mistake. Exactly the same list as
 * `server/viator.ts`.
 *
 * **A deliberate exception, for temporary testing only:**
 * `PAYPAL_ALLOW_SANDBOX_LIVE_DOMAIN=true` disables this block. It is a
 * separate, explicit flag - not a removal of the check - so turning it back
 * off is deleting one env var in Vercel and not a second code deploy.
 * **Delete this variable from Vercel the moment the test is over.**
 */
const PROD_HOSTS = new Set(['tiyulplus.com', 'www.tiyulplus.com']);

export function sandboxBlocked(host: string | null, mode: PaypalMode): boolean {
  if (mode !== 'sandbox') return false;
  if (process.env.PAYPAL_ALLOW_SANDBOX_LIVE_DOMAIN === 'true') return false;
  const h = (host ?? '').toLowerCase().split(':')[0];
  return PROD_HOSTS.has(h);
}

/* ============ 1. OAuth token, briefly cached ============ */

interface TokenEntry {
  token: string;
  expiresAt: number;
}
const tokenCache = new Map<PaypalMode, TokenEntry>();

/** Exported for paypalSubs.ts (the premium subscription) - same OAuth, same cache */
export async function accessToken(mode: PaypalMode): Promise<string | null> {
  const cached = tokenCache.get(mode);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

  const creds = credentials(mode);
  if (!creds) return null;
  try {
    const basic = Buffer.from(`${creds.clientId}:${creds.secret}`).toString('base64');
    const res = await fetch(`${paypalApiBase(mode)}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (typeof data.access_token !== 'string') return null;
    const ttlMs = (typeof data.expires_in === 'number' ? data.expires_in : 300) * 1000;
    tokenCache.set(mode, { token: data.access_token, expiresAt: Date.now() + ttlMs });
    return data.access_token;
  } catch {
    return null;
  }
}

/* ============ 2. Order creation ============ */

export interface CreateOrderInput {
  /** Our row id in purchases - sent as custom_id/reference_id, and used as the idempotency key for the creation itself */
  purchaseId: string;
  /** ILS, two decimal places - **always from the constant in lib/predeparture.ts, never from the client** */
  priceILS: number;
  tripName: string;
  /** Where PayPal returns the browser - we build it with our own purchaseId, and trust nothing PayPal appends */
  returnUrl: string;
  cancelUrl: string;
}

export interface CreatedOrder {
  orderId: string;
  approveUrl: string;
}

/**
 * Positive, with at most two digits after the decimal point. Checked via
 * `toFixed` and not `n * 100` on purpose - `29.9 * 100` is
 * `2990.0000000000005` in JS float precision, and a direct multiply would have
 * wrongly rejected our actual price.
 */
function isFinite2dp(n: number): boolean {
  return Number.isFinite(n) && n > 0 && Number(n.toFixed(2)) === n;
}

export async function createOrder(mode: PaypalMode, input: CreateOrderInput): Promise<CreatedOrder | null> {
  if (!isFinite2dp(input.priceILS)) return null;
  const token = await accessToken(mode);
  if (!token) return null;

  try {
    const res = await fetch(`${paypalApiBase(mode)}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        // PayPal's own idempotency key: a duplicate call with the same id
        // (e.g. a double-click on the pay button) does not create two orders.
        'PayPal-Request-Id': `order:${input.purchaseId}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: input.purchaseId,
            custom_id: input.purchaseId,
            description: `בדיקה לפני הנסיעה - ${input.tripName}`.slice(0, 127),
            amount: { currency_code: 'ILS', value: input.priceILS.toFixed(2) },
          },
        ],
        application_context: {
          brand_name: 'tiyul+',
          locale: 'he-IL',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING',
          return_url: input.returnUrl,
          cancel_url: input.cancelUrl,
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.warn('[paypal] create order', res.status);
      return null;
    }
    const data = (await res.json()) as {
      id?: string;
      links?: { rel?: string; href?: string }[];
    };
    if (typeof data.id !== 'string') return null;
    const approve = data.links?.find((l) => l.rel === 'approve')?.href;
    // Fallback: if the response is abnormal and carried no link, build it from PayPal's known URL shape
    const approveUrl = approve ?? `${CHECKOUT_HOST(mode)}/checkoutnow?token=${data.id}`;
    return { orderId: data.id, approveUrl };
  } catch {
    return null;
  }
}

/* ============ 3. Capture - **does not grant access by itself** ============ */

export type CaptureOutcome =
  | { ok: true; captureId: string; status: string; amountValue: string; currencyCode: string; payerEmail: string | null }
  | { ok: false; reason: 'not-configured' | 'network' | 'declined' | 'bad-response' };

/**
 * Captures a payment already approved on PayPal. **The response here is not
 * used to grant access** - see the file header. Its only role is to make the
 * money move; the webhook that follows is what actually decides.
 */
export async function captureOrder(mode: PaypalMode, orderId: string): Promise<CaptureOutcome> {
  const token = await accessToken(mode);
  if (!token) return { ok: false, reason: 'not-configured' };
  try {
    const res = await fetch(`${paypalApiBase(mode)}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `capture:${orderId}`,
      },
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => null)) as
      | {
          status?: string;
          purchase_units?: {
            payments?: {
              captures?: {
                id?: string;
                status?: string;
                amount?: { value?: string; currency_code?: string };
              }[];
            };
          }[];
          payer?: { email_address?: string };
        }
      | null;
    if (!res.ok || !data) return { ok: false, reason: res.status >= 500 ? 'network' : 'declined' };

    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
    if (!capture?.id || !capture.amount?.value || !capture.amount.currency_code) {
      return { ok: false, reason: 'bad-response' };
    }
    if (capture.status !== 'COMPLETED') return { ok: false, reason: 'declined' };
    return {
      ok: true,
      captureId: capture.id,
      status: capture.status,
      amountValue: capture.amount.value,
      currencyCode: capture.amount.currency_code,
      payerEmail: data.payer?.email_address ?? null,
    };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

/* ============ 4. Webhook verification ============ */

export interface WebhookHeaders {
  authAlgo: string | null;
  certUrl: string | null;
  transmissionId: string | null;
  transmissionSig: string | null;
  transmissionTime: string | null;
}

/**
 * Webhook signature verification against PayPal itself
 * (`/v1/notifications/verify-webhook-signature`) - this is PayPal's documented
 * and recommended way for an SDK-less integration, and it is essentially
 * equivalent to the manual HMAC done for Stripe: server-to-server verification,
 * no client in the middle, against the secret (`webhook_id`) configured here
 * and not whatever arrived in the request.
 */
export async function verifyWebhookSignature(
  mode: PaypalMode,
  headers: WebhookHeaders,
  rawBody: string,
): Promise<boolean> {
  const creds = credentials(mode);
  if (!creds) return false;
  if (!headers.authAlgo || !headers.certUrl || !headers.transmissionId || !headers.transmissionSig || !headers.transmissionTime) {
    return false;
  }

  // Deliberately checked before the OAuth network call: a corrupt body should
  // not cost us a call to PayPal, and certainly not be the first thing seen when
  // the check fails - a parse failure is cheap, so it comes first.
  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return false;
  }

  const token = await accessToken(mode);
  if (!token) return false;

  try {
    const res = await fetch(`${paypalApiBase(mode)}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_algo: headers.authAlgo,
        cert_url: headers.certUrl,
        transmission_id: headers.transmissionId,
        transmission_sig: headers.transmissionSig,
        transmission_time: headers.transmissionTime,
        webhook_id: creds.webhookId,
        webhook_event: event,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { verification_status?: string };
    return data.verification_status === 'SUCCESS';
  } catch {
    return false;
  }
}

/** For tests only */
export function resetPaypalCacheForTest(): void {
  tokenCache.clear();
}
