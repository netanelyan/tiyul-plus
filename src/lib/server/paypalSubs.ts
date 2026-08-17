/**
 * The premium subscription via PayPal Subscriptions - **the path replacing the
 * Stripe integration that was never wired up.** Exactly the same principles as
 * `paypal.ts` (the one-time purchase): direct REST with no SDK, server-only
 * keys, a timeout on every call, and the central rule - **nothing here grants
 * premium.** Creating a subscription only sends the user to approve it on
 * PayPal; what sets `plan='premium'` is only the verified webhook
 * (BILLING.SUBSCRIPTION.ACTIVATED in processCheckWebhook), in the same
 * structure where a check purchase becomes "paid" only from
 * PAYMENT.CAPTURE.COMPLETED.
 *
 * ## The price never comes from the client
 *
 * The billing plan is built from `PREMIUM_PRICE_ILS` alone - the single
 * constant in lib/plans.ts, the same rule as PRICE_ILS in the one-time purchase.
 *
 * ## The plan id is stored in app_flags, not in code
 *
 * PayPal requires a Product + Plan created once per environment. They are
 * created automatically on the first call and stored under
 * `paypal_plan_id_<mode>` - no manual step in the PayPal dashboard and no id
 * hardcoded in the code that breaks between sandbox and live.
 *
 * ## Who is the user? custom_id, not a table
 *
 * The subscription is created with `custom_id = userId` (a uuid from GoTrue,
 * not from the request body), and PayPal returns it on every webhook event of
 * that subscription - including cancellation. So activation and downgrade
 * depend on no new column: the verified event itself carries the user identity
 * that we set at creation.
 */

import { PREMIUM_PRICE_ILS } from '@/lib/plans';
import { accessToken, paypalApiBase, type PaypalMode } from '@/lib/server/paypal';
import { adminInsert, adminSelect, adminUpdate } from '@/lib/server/supabaseAdmin';
import { eq, pgQuery, pgSelect } from '@/lib/server/pgrest';

const PLAN_FLAG = (mode: PaypalMode) => `paypal_plan_id_${mode}`;

async function storedPlanId(mode: PaypalMode): Promise<string | null> {
  const rows = await adminSelect<{ value: unknown }>(
    'app_flags',
    pgQuery(eq('key', PLAN_FLAG(mode)), pgSelect(['value'])),
  );
  const v = rows?.[0]?.value;
  return typeof v === 'string' && v.length > 0 ? v : null;
}

async function storePlanId(mode: PaypalMode, planId: string): Promise<void> {
  await adminInsert('app_flags', { key: PLAN_FLAG(mode), value: planId }, { upsert: true });
}

/**
 * The billing plan id for the environment - created the first time (Product,
 * then Plan) and stored. A failure at any step returns null and the caller
 * answers "not available right now" - never an invented plan.
 */
export async function ensureSubscriptionPlan(mode: PaypalMode): Promise<string | null> {
  const existing = await storedPlanId(mode);
  if (existing) return existing;

  const token = await accessToken(mode);
  if (!token) return null;
  const base = paypalApiBase(mode);
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  try {
    const productRes = await fetch(`${base}/v1/catalogs/products`, {
      method: 'POST',
      headers: { ...auth, 'PayPal-Request-Id': `product:tiyul-premium:${mode}` },
      body: JSON.stringify({
        name: 'tiyul+ premium',
        description: 'מנוי חודשי לטיול+',
        type: 'SERVICE',
        category: 'TRAVEL',
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!productRes.ok) {
      console.warn('[paypal subs] create product', productRes.status);
      return null;
    }
    const product = (await productRes.json()) as { id?: string };
    if (typeof product.id !== 'string') return null;

    const planRes = await fetch(`${base}/v1/billing/plans`, {
      method: 'POST',
      headers: { ...auth, 'PayPal-Request-Id': `plan:tiyul-premium:${mode}` },
      body: JSON.stringify({
        product_id: product.id,
        name: 'tiyul+ premium חודשי',
        status: 'ACTIVE',
        billing_cycles: [
          {
            frequency: { interval_unit: 'MONTH', interval_count: 1 },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // Until cancelled
            pricing_scheme: {
              fixed_price: { value: PREMIUM_PRICE_ILS.toFixed(2), currency_code: 'ILS' },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          payment_failure_threshold: 2,
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!planRes.ok) {
      console.warn('[paypal subs] create plan', planRes.status);
      return null;
    }
    const plan = (await planRes.json()) as { id?: string };
    if (typeof plan.id !== 'string') return null;

    await storePlanId(mode, plan.id);
    return plan.id;
  } catch {
    return null;
  }
}

export interface CreatedSubscription {
  subscriptionId: string;
  approveUrl: string;
}

/** Creates a subscription for the user to approve. Grants nothing - only returns where to send them. */
export async function createSubscription(
  mode: PaypalMode,
  input: { userId: string; returnUrl: string; cancelUrl: string },
): Promise<CreatedSubscription | null> {
  const planId = await ensureSubscriptionPlan(mode);
  if (!planId) return null;
  const token = await accessToken(mode);
  if (!token) return null;

  try {
    const res = await fetch(`${paypalApiBase(mode)}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        // A double-click on the subscribe button does not create two subscriptions
        'PayPal-Request-Id': `sub:${input.userId}:${planId}`,
      },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: input.userId,
        application_context: {
          brand_name: 'tiyul+',
          locale: 'he-IL',
          user_action: 'SUBSCRIBE_NOW',
          shipping_preference: 'NO_SHIPPING',
          return_url: input.returnUrl,
          cancel_url: input.cancelUrl,
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.warn('[paypal subs] create subscription', res.status);
      return null;
    }
    const data = (await res.json()) as { id?: string; links?: { rel?: string; href?: string }[] };
    if (typeof data.id !== 'string') return null;
    const approve = data.links?.find((l) => l.rel === 'approve')?.href;
    if (!approve) return null;
    return { subscriptionId: data.id, approveUrl: approve };
  } catch {
    return null;
  }
}

/* ============ The webhook side: activation and downgrade ============ */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Activating premium from an approved PayPal subscription. Called **only** from
 * processCheckWebhook after signature verification - custom_id is the uuid we
 * set at creation, and the check here is shape protection only (an event with a
 * non-uuid custom_id was never created by us, so it is swallowed without
 * touching anything).
 */
export async function activatePaypalPremium(userId: string, subscriptionId: string): Promise<boolean> {
  if (!UUID_RE.test(userId)) return false;
  const patch = {
    plan: 'premium',
    plan_until: null,
    plan_source: 'paypal',
    paypal_subscription_id: subscriptionId.slice(0, 60),
    updated_at: new Date().toISOString(),
  };
  let rows = await adminUpdate<{ user_id: string }>('profiles', eq('user_id', userId), patch);
  // Paid before ever saving a profile - no row to update, so we create it
  if (rows && rows.length === 0) {
    rows = await adminInsert<{ user_id: string }>('profiles', { user_id: userId, ...patch }, { upsert: true });
  }
  return Boolean(rows && rows.length > 0);
}

/**
 * Downgrade on cancellation/suspension/expiry - **only when the current premium
 * really came from PayPal.** Without this safeguard, cancelling an old
 * subscription would also erase a manual admin grant or a promo-code redemption
 * given after the cancellation - exactly the bug plan_source exists to prevent.
 */
export async function cancelPaypalPremium(userId: string): Promise<boolean> {
  if (!UUID_RE.test(userId)) return false;
  const rows = await adminSelect<{ plan_source: string | null }>(
    'profiles',
    pgQuery(eq('user_id', userId), pgSelect(['plan_source'])),
  );
  if (!rows || rows.length === 0) return false;
  if (rows[0].plan_source !== 'paypal') return false; // Grant/promo/Stripe - not ours to downgrade
  const updated = await adminUpdate<{ user_id: string }>('profiles', eq('user_id', userId), {
    plan: 'free',
    plan_until: null,
    plan_source: null,
    updated_at: new Date().toISOString(),
  });
  return Boolean(updated && updated.length > 0);
}
