import { isRole } from '@/lib/plans';
import { eq, pgLimit, pgQuery, pgSelect } from '@/lib/server/pgrest';
import { requireRole, denied, badRequest, ok, audit } from '@/lib/server/admin';
import { adminInsert, adminSelect, adminUpdate, userByEmail } from '@/lib/server/supabaseAdmin';

/**
 * Changing a role - **owner only**, per Netanel's choice.
 *
 * Three deliberate refusals, and each of them is a security bug if it is missing:
 *
 * 1. **You cannot change your own role.** Otherwise an owner accidentally demotes themselves and
 *    there is no owner left in the system - a state that cannot be fixed from the UI, only by
 *    going back to the SQL Editor.
 * 2. **You cannot demote another owner.** Owner is the upper bound; whoever needs to change one
 *    does it against the database deliberately.
 * 3. **You cannot appoint an owner from here.** That role is seeded in SQL with the explicit
 *    email address, and that is the only way - so that "who the owner is" is a decision somebody
 *    wrote down, and not something that happened on a click.
 */
export async function POST(req: Request) {
  const actor = await requireRole(req, 'owner');
  if (!actor) return denied();

  let body: { email?: unknown; role?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return badRequest('bad_json');
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = body.role;
  if (!email || !email.includes('@')) return badRequest('bad_email');
  if (!isRole(role)) return badRequest('bad_role');
  if (role === 'owner') return badRequest('owner_is_seeded_in_sql');

  const user = await userByEmail(email);
  if (!user) return ok({ found: false });
  if (user.id === actor.userId) return badRequest('cannot_change_own_role');

  const existing = await adminSelect<{ role?: string }>(
    'profiles',
    pgQuery(eq('user_id', user.id), pgSelect(['role']), pgLimit(1)),
  );
  if (existing?.[0]?.role === 'owner') return badRequest('cannot_demote_owner');

  const patch = { role, updated_at: new Date().toISOString() };
  let rows = await adminUpdate<{ user_id: string }>('profiles', eq('user_id', user.id), patch);
  if (rows && rows.length === 0) {
    rows = await adminInsert<{ user_id: string }>('profiles', { user_id: user.id, ...patch }, { upsert: true });
  }
  if (!rows) return badRequest('db_unavailable');

  await audit(actor, 'set_role', user, { role, previous: existing?.[0]?.role ?? 'user' });
  return ok({ found: true, email: user.email, role });
}
