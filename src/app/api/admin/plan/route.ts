import { requireRole, denied, badRequest, ok, audit } from '@/lib/server/admin';
import { adminInsert, adminUpdate, userByEmail } from '@/lib/server/supabaseAdmin';
import { eq } from '@/lib/server/pgrest';
import type { PaidPlan } from '@/lib/plans';

/**
 * Granting or revoking premium.
 *
 * A positive `days` = premium that expires by itself after X days. `days: 0` = forever
 * (plan_until stays NULL). This is the gap the founder chose to leave open - "both, depending on
 * the case" - which is why the default in the UI is 30 days and not "forever": a grant that
 * expires by itself does not quietly become a free subscription for life.
 *
 * **plan_source='grant'** distinguishes a gift from a paid subscription. Without it, the Stripe
 * webhook that downgrades a cancelled subscription would have downgraded manual grants too.
 *
 * Revoking clears all three fields together - otherwise plan_until is left orphaned on a free
 * account, which is a state that is hard to explain in six months' time.
 */
export async function POST(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();

  let body: { email?: unknown; action?: unknown; days?: unknown; note?: unknown; plan?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return badRequest('bad_json');
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const action = body.action === 'revoke' ? 'revoke' : 'grant';
  const rawDays = Number(body.days);
  const days = Number.isFinite(rawDays) ? Math.max(0, Math.min(3650, Math.floor(rawDays))) : 30;
  const note = typeof body.note === 'string' ? body.note.slice(0, 200) : '';
  /*
    Which plan to grant. Closed list, defaulting to premium - an admin granting
    support access should get the cheaper plan unless they deliberately ask for
    the other one, and an unrecognised string must never widen a grant.
  */
  const grantPlan: PaidPlan = body.plan === 'pro' ? 'pro' : 'premium';

  if (!email || !email.includes('@')) return badRequest('bad_email');

  const user = await userByEmail(email);
  if (!user) return ok({ found: false });

  const until = action === 'grant' && days > 0
    ? new Date(Date.now() + days * 86_400_000).toISOString()
    : null;

  const patch =
    action === 'grant'
      ? { plan: grantPlan, plan_until: until, plan_source: 'grant', updated_at: new Date().toISOString() }
      : { plan: 'free', plan_until: null, plan_source: null, updated_at: new Date().toISOString() };

  let rows = await adminUpdate<{ user_id: string }>('profiles', eq('user_id', user.id), patch);
  // A user who signed up but has not saved a profile yet has no row to update, so we create it
  if (rows && rows.length === 0) {
    rows = await adminInsert<{ user_id: string }>('profiles', { user_id: user.id, ...patch }, { upsert: true });
  }
  if (!rows) return badRequest('db_unavailable');

  await audit(actor, action === 'grant' ? 'grant_premium' : 'revoke_premium', user, {
    plan: action === 'grant' ? grantPlan : undefined,
    days: action === 'grant' ? days : undefined,
    until,
    note: note || undefined,
  });

  return ok({ found: true, email: user.email, plan: action === 'grant' ? grantPlan : 'free', until });
}
