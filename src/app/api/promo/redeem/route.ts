import {
  PROMO_ATTEMPTS_PER_DAY,
  PROMO_ATTEMPTS_PER_HOUR,
  effectivePlan,
  grantedPlanFor,
  planAtLeast,
  type PaidPlan,
} from '@/lib/plans';
import { eq, pgLimit, pgQuery, pgSelect } from '@/lib/server/pgrest';
import { actorFrom } from '@/lib/server/admin';
import { checkLimit } from '@/lib/server/limits';
import { requestIp } from '@/lib/server/identity';
import { adminInsert, adminRpc, adminSelect, adminUpdate } from '@/lib/server/supabaseAdmin';

/**
 * Redemption of a promo code by the traveller themself. **Not** an admin
 * route - any signed-in user can call it - which makes it the most exposed
 * point of this feature, and it is built accordingly:
 *
 * - The identity comes from the token, not the body. A code cannot be
 *   redeemed "on behalf of" somebody else.
 * - The check and the update happen in one atomic RPC (`redeem_promo`), with
 *   a row lock. A read-then-write from the server would let two concurrent
 *   requests both redeem the last slot in a code.
 * - Double redemption is blocked by a composite primary key in the database,
 *   not by a condition in code.
 * - The error messages do not distinguish "code does not exist" from "code
 *   is full" - there is no reason to help somebody guessing codes.
 * - **Rate limiting on the guessing itself.** Without it every protection
 *   above is meaningless: a code is 3-24 alphanumeric characters, and a
 *   single signed-in account could scan thousands of codes a minute until
 *   one works. Counted both per account and per IP, because a new account is
 *   free and one email away - the address is what does not change easily.
 *
 * A grant via a code **extends** existing premium and never shortens it:
 * somebody who already has a month gets an additional month, and somebody
 * with a dateless Stripe subscription does not lose it.
 */
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

/** One block response for both meters - with the wait time, so the UI states a real number */
const tooMany = (r: { retryAfterSec: number }) =>
  new Response(JSON.stringify({ ok: false, error: 'too_many_attempts', retryAfterSec: r.retryAfterSec }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': String(r.retryAfterSec) },
  });

export async function POST(req: Request) {
  // **The per-address limit deliberately runs before authentication.**
  // `actorFrom` makes a network call to GoTrue plus a database read on every
  // attempt; if the block sits after it, somebody scanning codes still
  // exercises both a thousand times a minute. The identity that can be
  // trusted before authentication is the address, so it is checked first.
  const ip = `ip:${requestIp(req)}`;
  const ipHour = checkLimit('promo-hour', ip, PROMO_ATTEMPTS_PER_HOUR, 60 * 60_000);
  const ipDay = checkLimit('promo-day', ip, PROMO_ATTEMPTS_PER_DAY, 24 * 60 * 60_000);
  if (!ipHour.ok || !ipDay.ok) return tooMany(ipHour.ok ? ipDay : ipHour);

  const actor = await actorFrom(req);
  if (!actor) return json({ ok: false, error: 'not_signed_in' }, 401);

  let body: { code?: unknown };
  try {
    body = (await req.json()) as { code?: unknown };
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400);
  }
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!/^[A-Z0-9]{3,24}$/.test(code)) return json({ ok: false, error: 'bad_code' }, 400);

  // And additionally per account: switching addresses does not grant a fresh
  // quota on the same account.
  const userHour = checkLimit('promo-hour', actor.userId, PROMO_ATTEMPTS_PER_HOUR, 60 * 60_000);
  const userDay = checkLimit('promo-day', actor.userId, PROMO_ATTEMPTS_PER_DAY, 24 * 60 * 60_000);
  if (!userHour.ok || !userDay.ok) return tooMany(userHour.ok ? userDay : userHour);

  const days = await adminRpc<number>('redeem_promo', { p_code: code, p_user: actor.userId });
  if (days === null) return json({ ok: false, error: 'unavailable' }, 503);
  if (days === -1) return json({ ok: false, error: 'already_redeemed' }, 409);
  if (days <= 0) return json({ ok: false, error: 'invalid_code' }, 404);

  // Extend from the existing date if it is in the future, otherwise from now
  const current = await adminSelect<{ plan?: string; plan_until?: string | null }>(
    'profiles',
    pgQuery(eq('user_id', actor.userId), pgSelect(['plan', 'plan_until']), pgLimit(1)),
  );
  const row = current?.[0];
  const currentPlan = effectivePlan(row ?? null);
  const stripeForever = planAtLeast(currentPlan, 'premium') && !row?.plan_until;

  /*
    Which plan this code hands out. Read AFTER the RPC and from the same row -
    the atomic part (may this code still be redeemed) is `redeem_promo`'s job
    and is untouched; this is only asking what was on the code.

    Falls back to premium when the column does not exist yet (the SQL has not
    been run) or the read fails, which is both the safe direction and exactly
    what every existing code granted before the column was added.
  */
  let codePlan: PaidPlan = 'premium';
  try {
    const codeRows = await adminSelect<{ plan?: string }>(
      'promo_codes',
      pgQuery(eq('code', code), pgSelect(['plan']), pgLimit(1)),
    );
    if (codeRows?.[0]?.plan === 'pro') codePlan = 'pro';
  } catch {
    /* stay on premium */
  }

  /*
    **A promo may upgrade a plan, never demote one.** Written as a flat
    `plan: 'premium'`, redeeming a code while holding an active pro subscription
    would have quietly moved that subscriber down - and they would have been the
    ones to discover it, having just been handed what looked like a gift. So the
    result is the better of what they have and what the code gives.
  */
  const grantedPlan = grantedPlanFor(currentPlan, codePlan);
  const base =
    row?.plan_until && Date.parse(row.plan_until) > Date.now()
      ? Date.parse(row.plan_until)
      : Date.now();
  const until = stripeForever ? null : new Date(base + days * 86_400_000).toISOString();

  const patch = {
    plan: grantedPlan,
    plan_until: until,
    plan_source: stripeForever ? 'stripe' : 'promo',
    updated_at: new Date().toISOString(),
  };
  let rows = await adminUpdate<{ user_id: string }>('profiles', eq('user_id', actor.userId), patch);
  if (rows && rows.length === 0) {
    rows = await adminInsert<{ user_id: string }>('profiles', { user_id: actor.userId, ...patch }, { upsert: true });
  }
  if (!rows) return json({ ok: false, error: 'unavailable' }, 503);

  await adminInsert('admin_audit', {
    actor_user_id: actor.userId,
    actor_email: actor.email,
    action: 'redeem_promo',
    target_user_id: actor.userId,
    target_email: actor.email,
    detail: { code, days, until, plan: grantedPlan },
  });

  return json({ ok: true, days, until, plan: grantedPlan });
}
