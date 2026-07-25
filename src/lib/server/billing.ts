import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Plan } from '@/lib/plans';

/**
 * שרת בלבד - Stripe בלי SDK (חוק ברזל 6: בלי תלות חדשה).
 *
 * checkout: יצירת Checkout Session למנוי דרך ה-REST API (form-encoded).
 * webhook: אימות חתימת Stripe-Signature ידני (HMAC-SHA256 על
 * "<timestamp>.<raw body>", סבילות 5 דקות, השוואה קבועת-זמן).
 * עדכון התוכנית נכתב לפרופיל דרך ה-service role - הדרך היחידה שעמודת
 * plan משתנה (ראו supabase-premium.sql).
 */

const stripeKey = () => process.env.STRIPE_SECRET_KEY;
const priceId = () => process.env.STRIPE_PRICE_ID;
const supaUrl = () => process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

export const billingConfigured = () =>
  Boolean(stripeKey() && priceId() && supaUrl() && serviceKey());

const STRIPE_BASE = () => process.env.STRIPE_API_BASE ?? 'https://api.stripe.com';

/** יצירת Checkout Session למנוי. מחזיר את כתובת התשלום או null בכשל. */
export async function createCheckoutSession(
  userId: string,
  origin: string,
): Promise<string | null> {
  const body = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': priceId()!,
    'line_items[0][quantity]': '1',
    client_reference_id: userId,
    'subscription_data[metadata][user_id]': userId,
    success_url: `${origin}/premium?status=success`,
    cancel_url: `${origin}/premium?status=cancelled`,
  });
  try {
    const res = await fetch(`${STRIPE_BASE()}/v1/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const session = (await res.json()) as { url?: string };
    return typeof session.url === 'string' ? session.url : null;
  } catch {
    return null;
  }
}

/**
 * אימות חתימת webhook של Stripe. מחזיר true רק כשהחתימה תואמת והחותמת
 * בת פחות מ-5 דקות (הגנת replay).
 */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  nowSec = Math.floor(Date.now() / 1000),
): boolean {
  if (!signatureHeader) return false;
  let timestamp = '';
  const v1: string[] = [];
  for (const part of signatureHeader.split(',')) {
    const [k, v] = part.split('=', 2);
    if (k?.trim() === 't') timestamp = v ?? '';
    if (k?.trim() === 'v1' && v) v1.push(v);
  }
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  return v1.some((sig) => {
    const sigBuf = Buffer.from(sig, 'utf8');
    return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
  });
}

function serviceHeaders(): Record<string, string> {
  const key = serviceKey()!;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
}

/** עדכון התוכנית של משתמש (service role - עוקף את הרשאות העמודות) */
export async function setUserPlan(
  userId: string,
  plan: Plan,
  stripeCustomerId?: string,
): Promise<boolean> {
  try {
    const patch: Record<string, unknown> = { plan };
    if (stripeCustomerId) patch.stripe_customer_id = stripeCustomerId;
    // upsert: ייתכן שלמשתמש עוד אין שורת פרופיל (שילם לפני שמילא פרטים)
    const res = await fetch(
      `${supaUrl()}/rest/v1/profiles?on_conflict=user_id`,
      {
        method: 'POST',
        headers: { ...serviceHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ user_id: userId, ...patch }),
        signal: AbortSignal.timeout(8000),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** איתור משתמש לפי מזהה לקוח Stripe (לביטולי מנוי) */
export async function findUserByStripeCustomer(customerId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${supaUrl()}/rest/v1/profiles?stripe_customer_id=eq.${encodeURIComponent(customerId)}&select=user_id`,
      { headers: serviceHeaders(), signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { user_id?: string }[];
    return rows[0]?.user_id ?? null;
  } catch {
    return null;
  }
}
