import { createHmac, timingSafeEqual } from 'node:crypto';
import { eq, pgQuery, pgSelect } from '@/lib/server/pgrest';
import type { Plan } from '@/lib/plans';

/**
 * Server only - Stripe without an SDK (hard rule 6: no new dependency).
 *
 * checkout: creating a subscription Checkout Session via the REST API
 * (form-encoded).
 * webhook: manual Stripe-Signature verification (HMAC-SHA256 over
 * "<timestamp>.<raw body>", 5-minute tolerance, constant-time comparison).
 * The plan update is written to the profile via the service role - the only
 * way the plan column changes (see supabase-premium.sql).
 */

const stripeKey = () => process.env.STRIPE_SECRET_KEY;
const priceId = () => process.env.STRIPE_PRICE_ID;
const supaUrl = () => process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

export const billingConfigured = () =>
  Boolean(stripeKey() && priceId() && supaUrl() && serviceKey());

const STRIPE_BASE = () => process.env.STRIPE_API_BASE ?? 'https://api.stripe.com';

/** Creates a subscription Checkout Session. Returns the payment URL or null on failure. */
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
 * Verifies a Stripe webhook signature. Returns true only when the signature
 * matches and the timestamp is less than 5 minutes old (replay protection).
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

/** Updates a user's plan (service role - bypasses the column permissions) */
export async function setUserPlan(
  userId: string,
  plan: Plan,
  stripeCustomerId?: string,
): Promise<boolean> {
  try {
    const patch: Record<string, unknown> = { plan };
    if (stripeCustomerId) patch.stripe_customer_id = stripeCustomerId;
    // upsert: the user may not have a profile row yet (paid before filling in details)
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

/** Finds a user by their Stripe customer id (for subscription cancellations) */
export async function findUserByStripeCustomer(customerId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${supaUrl()}/rest/v1/profiles?${pgQuery(eq('stripe_customer_id', customerId), pgSelect(['user_id']))}`,
      { headers: serviceHeaders(), signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { user_id?: string }[];
    return rows[0]?.user_id ?? null;
  } catch {
    return null;
  }
}
