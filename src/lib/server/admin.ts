/**
 * שרת בלבד - שער ההרשאות של אזור הניהול.
 *
 * ## הכלל שכל השאר נשען עליו
 *
 * **התפקיד נקרא מהדאטהבייס לפי הטוקן, ולעולם לא מגוף הבקשה.**
 * לקוח יכול לשלוח `{"role":"owner"}` בכל בקשה, ולכן שום נתיב לא מסתכל
 * על מה שנשלח: מאמתים את הטוקן מול GoTrue, מקבלים uuid, וקוראים את
 * `profiles.role` עם ה-service role. אין דרך אחרת פנימה.
 *
 * ## למה אין מטמון על התפקיד
 *
 * `identity.ts` שומר את התוכנית במטמון של 5 דקות, וזה בסדר למכסות. כאן
 * לא: הורדת תפקיד חייבת לחול מיד, ולא להישאר תקפה חמש דקות אחרי שנשללה.
 * פעולות ניהול הן נדירות, אז העלות זניחה.
 */

import { type Role, isRole, roleAtLeast } from '@/lib/plans';
import { adminInsert, adminSelect, adminDbEnabled, emailByUserId } from '@/lib/server/supabaseAdmin';
import { eq, pgLimit, pgQuery, pgSelect } from '@/lib/server/pgrest';

export interface Actor {
  userId: string;
  email: string | null;
  role: Role;
}

const supaUrl = () => process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = () => process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function bearer(req: Request): string | null {
  const h = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1] : null;
}

/** מאמת את הטוקן מול GoTrue ומחזיר uuid, או null */
async function userIdFromToken(token: string): Promise<string | null> {
  if (!supaUrl() || !anonKey()) return null;
  try {
    const res = await fetch(`${supaUrl()}/auth/v1/user`, {
      headers: { apikey: anonKey()!, Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const u = (await res.json()) as { id?: string };
    return typeof u.id === 'string' ? u.id : null;
  } catch {
    return null;
  }
}

/**
 * האם אזור הניהול מוגדר בשרת בכלל - כלומר יש URL ויש service role.
 * שימושי כדי להבדיל בין "אין לך הרשאה" לבין "המפתח חסר" (ראו /api/admin/me).
 */
export const adminConfigured = () => adminDbEnabled();

/**
 * רק "האם זה מישהו מחובר באמת", בלי ה-service role. מאפשר להחזיר הודעת
 * "לא מוגדר" למשתמש מחובר גם כשאין מפתח - כי בלי המפתח אין שום דרך לקרוא
 * את התפקיד שלו ולכן אין דרך אחרת להבדיל בין המצבים.
 */
export async function signedInUserId(req: Request): Promise<string | null> {
  const token = bearer(req);
  return token ? userIdFromToken(token) : null;
}


/**
 * מי הקורא. מחזיר null כשאין טוקן תקין, כשה-service role לא מוגדר, או
 * כשעמודת role עוד לא קיימת (ה-SQL לא רץ) - בכל המקרים האלה אין ניהול,
 * וזה המצב הבטוח.
 */
export async function actorFrom(req: Request): Promise<Actor | null> {
  if (!adminDbEnabled()) return null;
  const token = bearer(req);
  if (!token) return null;
  const userId = await userIdFromToken(token);
  if (!userId) return null;
  const rows = await adminSelect<{ role?: string }>(
    'profiles',
    pgQuery(eq('user_id', userId), pgSelect(['role']), pgLimit(1)),
  );
  if (!rows || rows.length === 0) return null;
  const role = isRole(rows[0].role) ? rows[0].role : 'user';
  return { userId, email: await emailByUserId(userId), role };
}

/**
 * שער: מחזיר את הקורא רק אם יש לו לפחות את התפקיד הנדרש, אחרת null.
 * הנתיבים מחזירים על null את אותה תשובה שהם מחזירים למשתמש לא מחובר -
 * בלי לרמז שהאזור קיים.
 */
export async function requireRole(req: Request, need: Role): Promise<Actor | null> {
  const actor = await actorFrom(req);
  if (!actor) return null;
  return roleAtLeast(actor.role, need) ? actor : null;
}

/** תשובה אחידה לחוסר הרשאה. 404 ולא 403 בכוונה - אין מה לאשר לזרים. */
export const denied = () =>
  new Response(JSON.stringify({ error: 'not_found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });

export const badRequest = (message: string) =>
  new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });

export const ok = (data: unknown) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * יומן ביקורת. נכתב **לפני** שמחזירים תשובה מוצלחת, וכישלון בכתיבתו לא
 * מפיל את הפעולה - אבל כן נרשם בלוג השרת, כי יומן שקט הוא יומן שאין.
 */
export async function audit(
  actor: Actor,
  action: string,
  target: { userId?: string | null; email?: string | null } = {},
  detail: Record<string, unknown> = {},
): Promise<void> {
  const row = await adminInsert('admin_audit', {
    actor_user_id: actor.userId,
    actor_email: actor.email,
    action,
    target_user_id: target.userId ?? null,
    target_email: target.email ?? null,
    detail,
  });
  if (!row) console.error('[admin] audit write failed', { action, actor: actor.email });
}
