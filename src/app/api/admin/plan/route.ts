import { requireRole, denied, badRequest, ok, audit } from '@/lib/server/admin';
import { adminInsert, adminUpdate, userByEmail } from '@/lib/server/supabaseAdmin';
import { eq } from '@/lib/server/pgrest';

/**
 * הענקה או שלילה של פרימיום.
 *
 * `days` חיובי = פרימיום שפג מעצמו אחרי X ימים. `days: 0` = לתמיד
 * (plan_until נשאר NULL). זה הפער שהמייסד בחר להשאיר פתוח - "שניהם,
 * לפי המקרה" - ולכן ברירת המחדל ב-UI היא 30 יום ולא "לתמיד": הענקה
 * שפגה מעצמה לא הופכת בשקט למנוי חינם לנצח.
 *
 * **plan_source='grant'** מבדיל בין מתנה לבין מנוי בתשלום. בלי זה, ה-
 * webhook של Stripe שמוריד מנוי מבוטל היה מוריד גם הענקות ידניות.
 *
 * שלילה מנקה את שלושת השדות יחד - אחרת נשאר plan_until עזוב על חשבון
 * חינמי, שזה מצב שקשה להסביר בעוד חצי שנה.
 */
export async function POST(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();

  let body: { email?: unknown; action?: unknown; days?: unknown; note?: unknown };
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

  if (!email || !email.includes('@')) return badRequest('bad_email');

  const user = await userByEmail(email);
  if (!user) return ok({ found: false });

  const until = action === 'grant' && days > 0
    ? new Date(Date.now() + days * 86_400_000).toISOString()
    : null;

  const patch =
    action === 'grant'
      ? { plan: 'premium', plan_until: until, plan_source: 'grant', updated_at: new Date().toISOString() }
      : { plan: 'free', plan_until: null, plan_source: null, updated_at: new Date().toISOString() };

  let rows = await adminUpdate<{ user_id: string }>('profiles', eq('user_id', user.id), patch);
  // משתמש שנרשם אך טרם שמר פרופיל - אין לו שורה לעדכן, ולכן יוצרים אותה
  if (rows && rows.length === 0) {
    rows = await adminInsert<{ user_id: string }>('profiles', { user_id: user.id, ...patch }, { upsert: true });
  }
  if (!rows) return badRequest('db_unavailable');

  await audit(actor, action === 'grant' ? 'grant_premium' : 'revoke_premium', user, {
    days: action === 'grant' ? days : undefined,
    until,
    note: note || undefined,
  });

  return ok({ found: true, email: user.email, plan: action === 'grant' ? 'premium' : 'free', until });
}
