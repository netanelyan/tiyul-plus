import { effectivePlan, isRole } from '@/lib/plans';
import { eq, pgLimit, pgQuery, pgSelect } from '@/lib/server/pgrest';
import { requireRole, denied, badRequest, ok, audit } from '@/lib/server/admin';
import { adminSelect, userByEmail } from '@/lib/server/supabaseAdmin';
import { premiumBudgetFor } from '@/lib/server/budget';

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

  // תקרה הגנתית: זו רק ספירה, אבל בלי pgLimit שאילתה ל-user_trips
  // בלי מגבלת שורות היא בדיוק סוג הסריקה הבלתי-חסומה שאסור שתהיה
  // כאן - חשבון שנוצל לרעה ונושא אלפי שורות לא אמור להאט את החיפוש.
  // TRIPS_CAP תואם את ה-MAX_ROWS שכבר קיים ב-/api/admin/trips.
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
  // הכסף האמיתי של המנוי החודש - לאדמין בלבד. למשתמש עצמו זה לעולם
  // לא מוצג בדולרים, רק בספירות (ראו plans.ts).
  const premiumSpend = plan === 'premium' ? await premiumBudgetFor(user.id) : null;

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
    // כמו countAuthUsers: אם הגענו לתקרה, המספר למעלה הוא רצפה ולא
    // ספירה מדויקת - נאמר את זה במפורש ולא מוצג כאילו זה הכול.
    tripsCapped: (trips?.length ?? 0) >= TRIPS_CAP,
    unitsToday: usage?.[0]?.units ?? 0,
    premiumUsdMonth: premiumSpend?.spent ?? null,
    premiumCapUsd: premiumSpend?.budget ?? null,
  });
}
