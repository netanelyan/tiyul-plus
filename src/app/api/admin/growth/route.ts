import { requireRole, denied, badRequest, ok } from '@/lib/server/admin';
import { adminSelect } from '@/lib/server/supabaseAdmin';
import { pgLimit, pgQuery, pgSelect } from '@/lib/server/pgrest';
import { checkLimit, dayKey } from '@/lib/server/limits';
import type { EventRow } from '@/lib/growthMath';

/**
 * מדדי הצמיחה לדשבורד - קריאה בלבד של `app_events`.
 *
 * הנתיב מחזיר את השורות **כמו שהן** והלקוח מחשב טווחים (7/30/הכול)
 * ומגמות מקומית (`lib/growthMath.ts`, שנבדק ביחידה): הטבלה אגרגטיבית
 * וקטנה - שורה ליום לכל סוג - אז בקשה אחת מכסה את כל הטווחים והחלפת
 * טווח לא עולה סיבוב שרת.
 *
 * **`stored: false` כשהטבלה לא נקראת - וזה מוצג "לא נאסף", לא אפס.**
 * הכלל של נתנאל, אות באות: שבוע שקט ומונה שבור אסור שייראו זהים.
 */
export async function GET(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();

  const limit = checkLimit('admin-growth', actor.userId, 60, 60_000);
  if (!limit.ok) return badRequest('rate_limited');

  /*
    תקרה נדיבה בכוונה: 10 סוגי אירועים × 365 יום הם ~3,650 שורות
    בשנה - התקרה נוגעת רק אחרי יותר מחמש שנים, ואז truncated בצד
    הלקוח יגיד שהמספרים חלקיים במקום להציג סכום חסר כשלם.
  */
  const MAX_ROWS = 20_000;
  const rows = await adminSelect<EventRow>(
    'app_events',
    pgQuery(pgSelect(['day', 'kind', 'count']), pgLimit(MAX_ROWS)),
  );

  return ok({
    stored: rows !== null,
    rows: rows ?? [],
    truncated: (rows?.length ?? 0) >= MAX_ROWS,
    today: dayKey(),
  });
}
