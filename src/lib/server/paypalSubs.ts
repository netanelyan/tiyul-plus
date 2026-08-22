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
 *
 * ## custom_id says WHO forever, and WHAT only at creation
 *
 * Since the pro plan exists, custom_id also carries the tier (`<uuid>|pro`).
 * That is correct for a new subscription and **wrong for a revised one**: the
 * string is fixed when the subscription is created, so a premium subscriber who
 * upgrades still carries a custom_id saying premium. `planIdToPlan` exists for
 * exactly that, and the UPDATED webhook must use it.
 */

import { PREMIUM_PRICE_ILS, PRO_PRICE_ILS, type PaidPlan } from '@/lib/plans';
import { accessToken, paypalApiBase, type PaypalMode } from '@/lib/server/paypal';
import { adminInsert, adminSelect, adminUpdate } from '@/lib/server/supabaseAdmin';
import { eq, pgIn, pgQuery, pgSelect } from '@/lib/server/pgrest';

/** Everything that differs between the two subscription plans, in one place. */
const PLAN_SPEC: Record<PaidPlan, { priceILS: number; label: string; slug: string }> = {
  premium: { priceILS: PREMIUM_PRICE_ILS, label: 'tiyul+ premium', slug: 'premium' },
  pro: { priceILS: PRO_PRICE_ILS, label: 'tiyul+ pro', slug: 'pro' },
};

/**
 * The app_flags key holding the PayPal billing-plan id.
 *
 * **Premium keeps the unsuffixed key it has always had.** A subscription plan
 * already exists in PayPal under that key with real subscribers attached to
 * it; renaming the key would make `storedPlanId` miss it, create a *second*
 * PayPal plan for the same product, and split the subscriber base across two
 * plan ids for no reason at all.
 */
const PLAN_FLAG = (mode: PaypalMode, plan: PaidPlan) =>
  plan === 'premium' ? `paypal_plan_id_${mode}` : `paypal_plan_id_${mode}_${plan}`;

async function storedPlanId(mode: PaypalMode, plan: PaidPlan): Promise<string | null> {
  const rows = await adminSelect<{ value: unknown }>(
    'app_flags',
    pgQuery(eq('key', PLAN_FLAG(mode, plan)), pgSelect(['value'])),
  );
  const v = rows?.[0]?.value;
  return typeof v === 'string' && v.length > 0 ? v : null;
}

async function storePlanId(mode: PaypalMode, plan: PaidPlan, planId: string): Promise<void> {
  await adminInsert('app_flags', { key: PLAN_FLAG(mode, plan), value: planId }, { upsert: true });
}

/**
 * The billing plan id for the environment - created the first time (Product,
 * then Plan) and stored. A failure at any step returns null and the caller
 * answers "not available right now" - never an invented plan.
 */
export async function ensureSubscriptionPlan(
  mode: PaypalMode,
  plan: PaidPlan = 'premium',
): Promise<string | null> {
  const spec = PLAN_SPEC[plan];
  const existing = await storedPlanId(mode, plan);
  if (existing) return existing;

  const token = await accessToken(mode);
  if (!token) return null;
  const base = paypalApiBase(mode);
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  try {
    const productRes = await fetch(`${base}/v1/catalogs/products`, {
      method: 'POST',
      headers: { ...auth, 'PayPal-Request-Id': `product:tiyul-${spec.slug}:${mode}` },
      body: JSON.stringify({
        name: spec.label,
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
      headers: { ...auth, 'PayPal-Request-Id': `plan:tiyul-${spec.slug}:${mode}` },
      body: JSON.stringify({
        product_id: product.id,
        name: `${spec.label} חודשי`,
        status: 'ACTIVE',
        billing_cycles: [
          {
            frequency: { interval_unit: 'MONTH', interval_count: 1 },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // Until cancelled
            pricing_scheme: {
              fixed_price: { value: spec.priceILS.toFixed(2), currency_code: 'ILS' },
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
    // `created`, not `plan` - `plan` is now the parameter naming which tier this is
    const created = (await planRes.json()) as { id?: string };
    if (typeof created.id !== 'string') return null;

    await storePlanId(mode, plan, created.id);
    return created.id;
  } catch {
    return null;
  }
}

/**
 * The reverse of `storedPlanId`: which of our plans is this PayPal billing-plan
 * id? **Required by the revise flow and by nothing else**, for a reason worth
 * stating precisely.
 *
 * A subscription's `custom_id` is fixed when it is created and PayPal echoes
 * that same string forever. So after a premium subscriber revises up to pro,
 * their custom_id **still says premium** - reading the plan from it would
 * downgrade the person who just paid more, on the webhook that confirms they
 * paid more. The only field on an UPDATED event that reflects the new reality
 * is `plan_id`, and this is how it is read.
 *
 * Returns null for anything unrecognised, and the caller must treat that as
 * "change nothing" rather than as a default.
 */
export async function planIdToPlan(mode: PaypalMode, planId: string): Promise<PaidPlan | null> {
  if (!planId) return null;
  const keys = (Object.keys(PLAN_SPEC) as PaidPlan[]).map((p) => PLAN_FLAG(mode, p));
  const rows = await adminSelect<{ key: string; value: unknown }>(
    'app_flags',
    pgQuery(pgIn('key', keys), pgSelect(['key', 'value'])),
  );
  if (!rows) return null;
  for (const plan of Object.keys(PLAN_SPEC) as PaidPlan[]) {
    const want = PLAN_FLAG(mode, plan);
    const hit = rows.find((r) => r.key === want);
    if (hit && typeof hit.value === 'string' && hit.value === planId) return plan;
  }
  return null;
}

export interface CreatedSubscription {
  subscriptionId: string;
  approveUrl: string;
}

/** Creates a subscription for the user to approve. Grants nothing - only returns where to send them. */
export async function createSubscription(
  mode: PaypalMode,
  input: { userId: string; plan?: PaidPlan; returnUrl: string; cancelUrl: string },
): Promise<CreatedSubscription | null> {
  const plan = input.plan ?? 'premium';
  const planId = await ensureSubscriptionPlan(mode, plan);
  if (!planId) return null;
  const token = await accessToken(mode);
  if (!token) return null;

  try {
    const res = await fetch(`${paypalApiBase(mode)}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        // A double-click on the subscribe button does not create two subscriptions.
        // planId is in the key, so upgrading from premium to pro is still a NEW
        // subscription rather than a replayed idempotent one.
        'PayPal-Request-Id': `sub:${input.userId}:${planId}`,
      },
      body: JSON.stringify({
        plan_id: planId,
        /*
          **The tier travels inside custom_id**, as `<uuid>|<plan>`.

          PayPal echoes custom_id back on every signed webhook event for this
          subscription, so activation knows which plan to grant without a
          second lookup and without trusting anything the browser sends. The
          alternative - mapping `resource.plan_id` back through app_flags -
          costs a database read on the one path that must not fail, and gets
          the answer wrong if the flag was ever rewritten.

          A bare uuid (every subscription created before this existed) parses
          as premium, so old subscriptions keep renewing correctly.
        */
        custom_id: plan === 'premium' ? input.userId : `${input.userId}|${plan}`,
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

/* ============ Switching an existing subscription to another plan ============ */

/** What we need to know about a subscriber's existing PayPal subscription. */
export interface ExistingSubscription {
  subscriptionId: string;
  /** Where the current plan came from. Only 'paypal' can be revised. */
  source: string | null;
}

export async function existingSubscription(userId: string): Promise<ExistingSubscription | null> {
  if (!UUID_RE.test(userId)) return null;
  const rows = await adminSelect<{ paypal_subscription_id: string | null; plan_source: string | null }>(
    'profiles',
    pgQuery(eq('user_id', userId), pgSelect(['paypal_subscription_id', 'plan_source'])),
  );
  const row = rows?.[0];
  if (!row?.paypal_subscription_id) return null;
  return { subscriptionId: row.paypal_subscription_id, source: row.plan_source ?? null };
}

/**
 * Move an existing subscription onto a different billing plan, **instead of
 * selling a second one**.
 *
 * This is the whole reason the function exists. Creating a second subscription
 * does not replace the first: PayPal bills both, and the person who discovers
 * it is the customer who was actively trying to give us more money. `revise`
 * changes the plan on the subscription that already exists, so there is only
 * ever one.
 *
 * **It grants nothing**, exactly like `createSubscription`. It returns where to
 * send the user to approve the change; `plan='pro'` is written only by the
 * verified BILLING.SUBSCRIPTION.UPDATED webhook.
 *
 * PayPal may or may not require approval depending on the price direction. When
 * it does, the response carries an `approve` link and the user must go there -
 * so a missing link is treated as a failure rather than as silent success,
 * because "we changed your plan" is not something to assume.
 */
export async function reviseSubscription(
  mode: PaypalMode,
  input: { subscriptionId: string; plan: PaidPlan; returnUrl: string; cancelUrl: string },
): Promise<{ approveUrl: string } | null> {
  const planId = await ensureSubscriptionPlan(mode, input.plan);
  if (!planId) return null;
  const token = await accessToken(mode);
  if (!token) return null;

  try {
    const res = await fetch(
      `${paypalApiBase(mode)}/v1/billing/subscriptions/${encodeURIComponent(input.subscriptionId)}/revise`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planId,
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
      },
    );
    if (!res.ok) {
      console.warn('[paypal subs] revise', res.status);
      return null;
    }
    const data = (await res.json()) as { links?: { rel?: string; href?: string }[] };
    const approve = data.links?.find((l) => l.rel === 'approve')?.href;
    if (!approve) {
      // No approval link means we cannot show the user where to confirm, and we
      // must not tell them it is done - the webhook is the only thing that knows.
      console.warn('[paypal subs] revise returned no approve link');
      return null;
    }
    return { approveUrl: approve };
  } catch {
    return null;
  }
}

/* ============ The webhook side: activation and downgrade ============ */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Splits the `<uuid>` / `<uuid>|<plan>` custom_id back apart.
 *
 * An unrecognised suffix resolves to **premium, not to the value it claims** -
 * the string arrives through a verified webhook so it should always be one we
 * wrote, and if it somehow is not, the safe direction is the cheaper plan.
 */
export function parseSubscriptionCustomId(
  raw: string,
): { userId: string; plan: PaidPlan } | null {
  const [id, suffix] = raw.split('|');
  if (!UUID_RE.test(id ?? '')) return null;
  return { userId: id, plan: suffix === 'pro' ? 'pro' : 'premium' };
}

/**
 * Activating premium from an approved PayPal subscription. Called **only** from
 * processCheckWebhook after signature verification - custom_id is the uuid we
 * set at creation, and the check here is shape protection only (an event with a
 * non-uuid custom_id was never created by us, so it is swallowed without
 * touching anything).
 */
export async function activatePaypalPremium(
  userId: string,
  subscriptionId: string,
  plan: PaidPlan = 'premium',
): Promise<boolean> {
  if (!UUID_RE.test(userId)) return false;
  const patch = {
    plan,
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
