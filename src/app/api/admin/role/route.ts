import { isRole } from '@/lib/plans';
import { eq, pgLimit, pgQuery, pgSelect } from '@/lib/server/pgrest';
import { requireRole, denied, badRequest, ok, audit } from '@/lib/server/admin';
import { adminInsert, adminSelect, adminUpdate, userByEmail } from '@/lib/server/supabaseAdmin';

/**
 * שינוי תפקיד - **owner בלבד**, לפי הבחירה של נתנאל.
 *
 * שלוש סירובים מכוונים, וכל אחד מהם הוא באג אבטחה אם הוא חסר:
 *
 * 1. **אי אפשר לשנות את התפקיד של עצמך.** אחרת owner מוריד את עצמו
 *    בטעות ואין יותר אף owner במערכת - מצב שאי אפשר לתקן מה-UI, רק
 *    בחזרה ל-SQL Editor.
 * 2. **אי אפשר להוריד owner אחר.** owner הוא הגבול העליון; מי שצריך
 *    לשנות אותו עושה זאת מול הדאטהבייס במודע.
 * 3. **אי אפשר למנות owner מכאן.** התפקיד הזה נזרע ב-SQL עם המייל
 *    המפורש, וזו הדרך היחידה - כך ש"מי הבעלים" הוא החלטה שמישהו כתב,
 *    ולא משהו שקרה בלחיצה.
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
