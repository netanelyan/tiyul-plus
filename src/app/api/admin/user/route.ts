import { effectivePlan, isRole, paidPlanOf } from '@/lib/plans';
import { eq, pgLimit, pgQuery, pgSelect } from '@/lib/server/pgrest';
import { requireRole, denied, badRequest, ok, audit } from '@/lib/server/admin';
import { adminSelect, userByEmail } from '@/lib/server/supabaseAdmin';
import { premiumBudgetFor } from '@/lib/server/budget';

/**
 * Looking up a traveller by email, for support purposes.
 *
 * What is returned and what is not: plan, role, expiry date, trip count and today's AI
 * usage. Trip content, conversations, phone number and photo are **not** returned - an
 * admin needs to know whether somebody has premium and whether they hit a quota, not to
 * read their trips. The search itself is logged too: viewing a user's account is an action.
 */
export async function POST(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();

  let body: { email?: unknown };
  try {
    body = (await req.json()) as { email?: unknown };
  } catch {
    return badRequest('bad_json');
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || !email.includes('@')) return badRequest('bad_email');

  const user = await userByEmail(email);
  if (!user) return ok({ found: false });

  const profiles = await adminSelect<{
    role?: string;
    plan?: string;
    plan_until?: string | null;
    plan_source?: string | null;
    display_name?: string | null;
    is_public?: boolean;
  }>('profiles', pgQuery(
    eq('user_id', user.id),
    pgSelect(['role', 'plan', 'plan_until', 'plan_source', 'display_name', 'is_public']),
    pgLimit(1),
  ));
  const p = profiles?.[0] ?? null;

  // A protective ceiling: this is only a count, but without pgLimit a query to user_trips
  // with no row limit is exactly the kind of unbounded scan that must not exist here - an
  // abused account carrying thousands of rows should not slow the search down.
  // TRIPS_CAP matches the MAX_ROWS that already exists in /api/admin/trips.
  const TRIPS_CAP = 2000;
  const trips = await adminSelect<{ id: string }>(
    'user_trips',
    pgQuery(eq('user_id', user.id), pgSelect(['id']), pgLimit(TRIPS_CAP)),
  );

  const today = new Date().toISOString().slice(0, 10);
  const usage = await adminSelect<{ units: number }>(
    'usage_daily',
    pgQuery(eq('identity', `user:${user.id}`), eq('day', today), pgSelect(['units']), pgLimit(1)),
  );

  await audit(actor, 'lookup_user', { userId: user.id, email: user.email });

  const plan = effectivePlan(p ?? null);
  // The subscriber's real money this month - for the admin only. It is never shown to the
  // user themselves in dollars, only as counts (see plans.ts).
  // Ordinal and plan-aware: a pro subscriber has a different cap, so passing the
  // plan is what makes the /cap figure on the card true rather than premium's.
  const paidPlan = paidPlanOf({ plan, userId: user.id });
  const premiumSpend = paidPlan ? await premiumBudgetFor(user.id, paidPlan) : null;

  return ok({
    found: true,
    email: user.email,
    userId: user.id,
    displayName: p?.display_name ?? null,
    role: isRole(p?.role) ? p!.role : 'user',
    plan,
    planStored: p?.plan ?? 'free',
    planUntil: p?.plan_until ?? null,
    planSource: p?.plan_source ?? null,
    isPublic: Boolean(p?.is_public),
    trips: trips?.length ?? 0,
    // Like countAuthUsers: if we reached the cap, the number above is a floor and not an
    // exact count - say so explicitly rather than present it as the whole picture.
    tripsCapped: (trips?.length ?? 0) >= TRIPS_CAP,
    unitsToday: usage?.[0]?.units ?? 0,
    premiumUsdMonth: premiumSpend?.spent ?? null,
    premiumCapUsd: premiumSpend?.budget ?? null,
  });
}
