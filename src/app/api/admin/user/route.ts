import { effectivePlan, isRole } from '@/lib/plans';
import { eq, pgLimit, pgQuery, pgSelect } from '@/lib/server/pgrest';
import { requireRole, denied, badRequest, ok, audit } from '@/lib/server/admin';
import { adminSelect, userByEmail } from '@/lib/server/supabaseAdmin';

/**
 * חיפוש מטייל לפי מייל, לצורכי תמיכה.
 *
 * מה נחזיר ומה לא: תוכנית, תפקיד, תאריך פקיעה, מספר טיולים ושימוש AI
 * היום. **לא** מוחזרים תוכן טיולים, שיחות, טלפון או תמונה - אדמין צריך
 * לדעת אם למישהו יש פרימיום ואם הוא נתקע במכסה, לא לקרוא את הטיולים
 * שלו. גם החיפוש עצמו נרשם ביומן: הצפייה בחשבון של משתמש היא פעולה.
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

  const trips = await adminSelect<{ id: string }>(
    'user_trips',
    pgQuery(eq('user_id', user.id), pgSelect(['id'])),
  );

  const today = new Date().toISOString().slice(0, 10);
  const usage = await adminSelect<{ units: number }>(
    'usage_daily',
    pgQuery(eq('identity', `user:${user.id}`), eq('day', today), pgSelect(['units']), pgLimit(1)),
  );

  await audit(actor, 'lookup_user', { userId: user.id, email: user.email });

  return ok({
    found: true,
    email: user.email,
    userId: user.id,
    displayName: p?.display_name ?? null,
    role: isRole(p?.role) ? p!.role : 'user',
    plan: effectivePlan(p ?? null),
    planStored: p?.plan ?? 'free',
    planUntil: p?.plan_until ?? null,
    planSource: p?.plan_source ?? null,
    isPublic: Boolean(p?.is_public),
    trips: trips?.length ?? 0,
    unitsToday: usage?.[0]?.units ?? 0,
  });
}
