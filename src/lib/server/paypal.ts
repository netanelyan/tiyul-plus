/**
 * שרת בלבד - **PayPal בלי SDK** (חוק ברזל 6: בלי תלות חדשה), באותו סגנון
 * בדיוק כמו `server/billing.ts` (Stripe) ו-`server/viator.ts`: REST ישיר
 * עם `fetch`, מפתחות בסביבת השרת בלבד, ותמיד `AbortSignal.timeout`.
 *
 * ## שני כללים שהקובץ הזה קיים כדי לאכוף
 *
 * 1. **המחיר לא מגיע מהלקוח.** `createOrder` מקבל `priceILS` כפרמטר -
 *    הקוראים היחידים לו (`/api/checks/create-order`) מעבירים את הקבוע
 *    מ-`lib/predeparture.ts`, אף פעם לא ערך מגוף הבקשה.
 * 2. **אין כאן שום דבר שמעניק גישה.** הקובץ הזה יודע לדבר עם PayPal -
 *    ליצור הזמנה, ללכוד תשלום, ולאמת חתימת webhook. **מה שקורה עם
 *    התוצאה** (מתי `purchases.status` הופך ל-`paid`) הוא ב-`purchases.ts`
 *    ובנתיב ה-webhook בלבד. לכידה מוצלחת כאן היא לא הענקה.
 *
 * ## מצב (sandbox/production), באותה תבנית בדיוק כמו Viator
 *
 * המפתח החי לא נכנס לשימוש עד ש-`PAYPAL_MODE=production` נכתב במפורש,
 * גם אם המפתח כבר מוגדר. `sandboxBlocked` חוסם דומיין חי ממצב sandbox -
 * אותה בדיקה, אותם `PROD_HOSTS`, אותה סיבה: רכישת בדיקה על הדומיין
 * האמיתי היא הדבר שאסור שיקרה אפילו פעם אחת.
 */

export type PaypalMode = 'off' | 'sandbox' | 'production';

export function paypalMode(): PaypalMode {
  const raw = (process.env.PAYPAL_MODE ?? '').toLowerCase();
  if (raw === 'off') return 'off';
  if (raw === 'production') {
    return process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET ? 'production' : 'off';
  }
  return process.env.PAYPAL_CLIENT_ID_SANDBOX && process.env.PAYPAL_CLIENT_SECRET_SANDBOX
    ? 'sandbox'
    : 'off';
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

/** ניתן לדריסה מלאה בטסטים/אימות מול שרת מדומה - כמו STRIPE_API_BASE ו-VIATOR_BASE_URL */
export const paypalApiBase = (mode: PaypalMode) =>
  process.env.PAYPAL_API_BASE ??
  (mode === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');

/** דף הכניסה של PayPal עצמו, לבניית קישור אישור כגיבוי אם התשובה לא נשאה `links` */
const CHECKOUT_HOST = (mode: PaypalMode) =>
  mode === 'production' ? 'https://www.paypal.com' : 'https://www.sandbox.paypal.com';

/**
 * הדומיין החי. במצב sandbox בקשה מהדומיין הזה נדחית באופן גורף - אין
 * דרך שרכישת בדיקה תעניק גישה אמיתית למישהו אמיתי, אפילו לא בטעות
 * תצורה. אותה רשימה בדיוק כמו `server/viator.ts`.
 */
const PROD_HOSTS = new Set(['tiyulplus.com', 'www.tiyulplus.com']);

export function sandboxBlocked(host: string | null, mode: PaypalMode): boolean {
  if (mode !== 'sandbox') return false;
  const h = (host ?? '').toLowerCase().split(':')[0];
  return PROD_HOSTS.has(h);
}

/* ============ 1. טוקן OAuth, במטמון קצר ============ */

interface TokenEntry {
  token: string;
  expiresAt: number;
}
const tokenCache = new Map<PaypalMode, TokenEntry>();

async function accessToken(mode: PaypalMode): Promise<string | null> {
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

/* ============ 2. יצירת הזמנה ============ */

export interface CreateOrderInput {
  /** מזהה השורה שלנו ב-purchases - נשלח כ-custom_id/reference_id, ומשמש מפתח אידמפוטנטיות ליצירה עצמה */
  purchaseId: string;
  /** ש"ח, שני עמודות עשרוניות - **תמיד מהקבוע ב-lib/predeparture.ts, אף פעם לא מהלקוח** */
  priceILS: number;
  tripName: string;
  /** לאן PayPal מחזיר את הדפדפן - אנחנו בונים אותו עם purchaseId משלנו, ולא סומכים על שום דבר ש-PayPal יוסיף */
  returnUrl: string;
  cancelUrl: string;
}

export interface CreatedOrder {
  orderId: string;
  approveUrl: string;
}

/**
 * חיובי, ובעל לכל היותר שתי ספרות אחרי הנקודה. בדיקה דרך `toFixed`
 * ולא `n * 100` בכוונה - `29.9 * 100` הוא `2990.0000000000005` בדיוק
 * הצף של JS, וכפל ישיר היה דוחה בטעות את המחיר האמיתי שלנו.
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
        // מפתח אידמפוטנטיות של PayPal עצמו: קריאה כפולה עם אותו מזהה
        // (למשל דאבל-קליק על "תשלום") לא יוצרת שתי הזמנות.
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
    // גיבוי: אם התשובה חריגה ולא נשאה קישור, בונים אותו מהצורה הידועה של PayPal
    const approveUrl = approve ?? `${CHECKOUT_HOST(mode)}/checkoutnow?token=${data.id}`;
    return { orderId: data.id, approveUrl };
  } catch {
    return null;
  }
}

/* ============ 3. לכידה - **לא מעניקה גישה בעצמה** ============ */

export type CaptureOutcome =
  | { ok: true; captureId: string; status: string; amountValue: string; currencyCode: string; payerEmail: string | null }
  | { ok: false; reason: 'not-configured' | 'network' | 'declined' | 'bad-response' };

/**
 * לוכדת תשלום שכבר אושר ב-PayPal. **התשובה כאן אינה משמשת להענקת
 * גישה** - ראו את הכותרת של הקובץ. תפקידה היחיד הוא לגרום לכסף לזוז;
 * ה-webhook שמגיע בעקבות זה הוא מה שבאמת קובע.
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

/* ============ 4. אימות webhook ============ */

export interface WebhookHeaders {
  authAlgo: string | null;
  certUrl: string | null;
  transmissionId: string | null;
  transmissionSig: string | null;
  transmissionTime: string | null;
}

/**
 * אימות חתימת webhook מול PayPal עצמו (`/v1/notifications/verify-webhook-signature`)
 * - זו הדרך המתועדת והמומלצת של PayPal לאינטגרציה בלי SDK, והיא
 * שקולה במהות ל-HMAC הידני שנעשה עבור Stripe: אימות שרת-לשרת, בלי
 * לקוח באמצע, מול הסוד (`webhook_id`) שהוגדר כאן ולא מה שהגיע בבקשה.
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
  const token = await accessToken(mode);
  if (!token) return false;

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return false;
  }

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

/** לבדיקות בלבד */
export function resetPaypalCacheForTest(): void {
  tokenCache.clear();
}
