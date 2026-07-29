import { PLAN_LIMITS } from '@/lib/plans';
import { gte, pgLimit, pgOrder, pgQuery, pgSelect } from '@/lib/server/pgrest';
import { requireRole, denied, ok } from '@/lib/server/admin';
import { adminSelect, countAuthUsers } from '@/lib/server/supabaseAdmin';

/**
 * לוח המצב: מה הסוכן עולה, ומי נתקע.
 *
 * הכל נגזר מ-`usage_daily` שכבר נאסף בשביל המכסות - אין כאן איסוף חדש
 * ואין מידע אישי חדש. הזהויות שם הן `user:<uuid>` או `ip:<addr>`, ולכן
 * המספרים מבדילים בין מחוברים לאנונימיים בלי לזהות אף אחד.
 *
 * "מי קרוב למכסה" הוא הנתון המעשי היחיד כאן: זה מה שמראה מי יקבל הודעת
 * חסימה היום, לפני שהוא פותח פנייה.
 */
export async function GET(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);

  const rows = await adminSelect<{ identity: string; day: string; units: number }>(
    'usage_daily',
    pgQuery(gte('day', weekAgo), pgSelect(['identity', 'day', 'units']), pgOrder('units', 'desc'), pgLimit(2000)),
  );
  const profiles = await adminSelect<{ plan?: string; plan_until?: string | null; role?: string }>(
    'profiles',
    'select=plan,plan_until,role&limit=5000',
  );
  // **חשבונות נספרים מ-auth.users ולא מ-profiles.** שורת profiles נוצרת רק
  // כשמישהו שומר פרופיל, ולכן הספירה הקודמת הראתה "1" כשהיו כמה חשבונות
  // של בני משפחה שפשוט לא נגעו באזור האישי.
  const users = await countAuthUsers();

  const todayRows = (rows ?? []).filter((r) => r.day === today);
  const byDay = new Map<string, number>();
  for (const r of rows ?? []) byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.units);

  const freeCap = PLAN_LIMITS.free.aiUnitsPerDay;
  const nearCap = todayRows.filter((r) => r.units >= freeCap * 0.8).length;
  const atCap = todayRows.filter((r) => r.units >= freeCap).length;

  return ok({
    today: {
      identities: todayRows.length,
      loggedIn: todayRows.filter((r) => r.identity.startsWith('user:')).length,
      anonymous: todayRows.filter((r) => r.identity.startsWith('ip:')).length,
      units: todayRows.reduce((n, r) => n + r.units, 0),
      nearCap,
      atCap,
      top: todayRows.slice(0, 8).map((r) => ({
        kind: r.identity.startsWith('user:') ? 'user' : 'anon',
        units: r.units,
      })),
    },
    week: [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, units]) => ({ day, units })),
    accounts: {
      total: users?.total ?? profiles?.length ?? 0,
      capped: users?.capped ?? false,
      /** מתוכם שמרו פרופיל - ההפרש הוא מי שנכנס ולא נגע באזור האישי */
      withProfile: profiles?.length ?? 0,
      premium: (profiles ?? []).filter(
        (p) => p.plan === 'premium' && (!p.plan_until || Date.parse(p.plan_until) > Date.now()),
      ).length,
      admins: (profiles ?? []).filter((p) => p.role === 'admin' || p.role === 'owner').length,
    },
    freeCap,
  });
}
